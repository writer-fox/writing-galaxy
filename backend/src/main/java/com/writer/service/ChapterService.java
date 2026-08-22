package com.writer.service;

import com.writer.dao.ChapterDao;
import com.writer.model.Chapter;
import com.writer.model.CreateChapterRequest;
import com.writer.model.UpdateChapterRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * 章节服务。
 * sort_order 作为唯一稳定坐标（时间轴基准）。
 * 新建/删除后做「内存全量紧凑重排」，保证坐标始终为 1,2,3…（并对齐方案「一键压实」）。
 */
@Service
public class ChapterService {

    private final ChapterDao dao;

    public ChapterService(ChapterDao dao) {
        this.dao = dao;
    }

    public List<Chapter> listByWork(Long workId) {
        return dao.listByWork(workId);
    }

    public Optional<Chapter> get(Long id) {
        return dao.findById(id);
    }

    /**
     * 新建章节。afterSortOrder 非空则插入到该坐标之后，否则追加末尾。
     * 随后全量紧凑重排。
     */
    @Transactional
    public Chapter create(Long workId, CreateChapterRequest req) {
        String title = req.title() == null || req.title().isBlank() ? "新章节" : req.title();
        Integer after = req.afterSortOrder();

        // 临时占位坐标（末尾最大值）插入，随后重排
        int tempOrder = dao.appendOrder(workId);
        long newId = dao.insert(workId, title, tempOrder);

        // 读回含新章的有序列表
        List<Chapter> all = dao.listByWork(workId); // 按 sort_order 升序，新章在临时最大位
        List<Chapter> ordered = new ArrayList<>();
        Chapter inserted = null;
        for (Chapter c : all) {
            if (c.id() == newId) inserted = c;
            else ordered.add(c);
        }
        if (inserted == null) inserted = ordered.isEmpty() ? null : ordered.get(ordered.size() - 1);

        if (after != null && ordered.size() > 0) {
            // 插入到第一个 order > after 之前
            int idx = -1;
            for (int i = 0; i < ordered.size(); i++) {
                if (ordered.get(i).sortOrder() > after) { idx = i; break; }
            }
            ordered.add(idx == -1 ? ordered.size() : idx, inserted);
        } else {
            ordered.add(inserted);
        }

        renumber(ordered);
        // 返回重排后的最新记录（sort_order 已压实）
        return dao.findById(inserted.id()).orElse(inserted);
    }

    @Transactional
    public boolean update(Long id, UpdateChapterRequest req) {
        Optional<Chapter> existing = dao.findById(id);
        if (existing.isEmpty()) return false;
        Chapter cur = existing.get();
        String title = req.title() != null ? req.title() : cur.title();
        String content = req.content() != null ? req.content() : cur.content();
        Integer status = req.status() != null ? req.status() : cur.status();
        dao.updateContent(id, title, content, status);
        return true;
    }

    @Transactional
    public boolean delete(Long workId, Long id) {
        Optional<Chapter> existing = dao.findById(id);
        if (existing.isEmpty()) return false;
        dao.delete(id);
        // 删除后全量紧凑重排
        List<Chapter> rest = dao.listByWork(workId);
        renumber(rest);
        return true;
    }

    private void renumber(List<Chapter> list) {
        if (list.isEmpty()) return;
        long workId = list.get(0).workId();
        // 阶段1：全部取负（避唯一约束），阶段2：逐条设为 1..N
        dao.negateOrders(workId);
        int i = 1;
        for (Chapter c : list) {
            dao.updateOrder(c.id(), i++);
        }
    }
}
