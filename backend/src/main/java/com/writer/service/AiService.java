package com.writer.service;

import com.writer.dao.CastDao;
import com.writer.dao.ChapterDao;
import com.writer.model.Chapter;
import com.writer.service.llm.LlmProvider;
import com.writer.service.llm.ProviderNotConfiguredException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.StringJoiner;

/**
 * AI 编排：取章节正文 + 已知实体 → 组装 prompt → 调 LLM。
 * 未配置 key（ProviderNotConfiguredException）时由 controller 转为友好提示，不崩溃。
 */
@Service
public class AiService {

    private final ChapterDao chapterDao;
    private final CastDao castDao;
    private final LlmProvider llm;

    public AiService(ChapterDao chapterDao, CastDao castDao, LlmProvider llm) {
        this.chapterDao = chapterDao;
        this.castDao = castDao;
        this.llm = llm;
    }

    /** 生成三层大纲（简略版：取全书章节，要求 LLM 输出结构化 JSON） */
    public String generateOutline(Long workId) {
        List<Chapter> chapters = chapterDao.listByWork(workId);
        StringJoiner sj = new StringJoiner("\n\n");
        for (Chapter c : chapters) {
            sj.add("【第 " + c.sortOrder() + " 章 · " + c.title() + "】\n" + c.content());
        }
        String system = "你是网文大纲整理助手。把给定章节整理成结构化三层大纲 JSON："
            + "{\"outline\":[{\"level\":1,\"title\":\"分卷名\",\"content\":\"...\","
            + "\"children\":[{\"level\":2,\"refSortOrder\":章号,\"title\":\"章纲\",\"content\":\"...\"}]}]}。"
            + "要求：提取核心冲突与人物动向，不要编造未发生剧情。只输出 JSON。";
        return llm.complete(system, "章节内容：\n" + (sj.length() == 0 ? "（暂无章节）" : sj));
    }

    /** 单章人物/关系抽取（返回一段说明；简略版不自动入库，仅返回 LLM 结果供前端展示/二次确认） */
    public String analyzeChapter(Long chapterId) {
        Chapter c = chapterDao.findById(chapterId)
            .orElseThrow(() -> new IllegalArgumentException("章节不存在: " + chapterId));
        // 已知实体，避免 LLM 重复创建
        StringJoiner known = new StringJoiner(", ");
        castDao.listFactions(c.workId()).forEach(f -> known.add("势力:" + f.name()));
        castDao.listCharacters(c.workId()).forEach(ch -> known.add("人物:" + ch.name()));

        String system = "你是网文关系抽取助手。已知实体（避免重复创建）：" + known
            + "。阅读本章，输出 JSON："
            + "{\"newCharacters\":[...],\"relationships\":[{\"from\":\"\",\"to\":\"\",\"type\":\"belong_to|ally|enemy|kinship|master_disciple|lover|subordinate|custom\",\"strength\":0.5,\"note\":\"\"}]}。"
            + "只输出 JSON，不要编造。";
        String content = c.content() == null ? "" : c.content();
        if (content.isBlank()) {
            throw new IllegalArgumentException("第 " + c.sortOrder() + " 章「" + c.title() + "」还没有正文，无法分析。");
        }
        return llm.complete(system, "【第 " + c.sortOrder() + " 章 · " + c.title() + "】\n" + content);
    }
}

