package com.writer.service;

import com.writer.dao.GraphDao;
import com.writer.model.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GraphService {

    private final GraphDao dao;

    public GraphService(GraphDao dao) {
        this.dao = dao;
    }

    /** rel_type → 边颜色 / 是否有向（与前端 tokens.css --graph-* 一致，方案 4.2.6） */
    private static final Map<String, Map.Entry<String, Boolean>> REL_META = new HashMap<>();

    static {
        rel("belong_to", "#8d9199", true);
        rel("ally", "#3dbd7d", false);
        rel("enemy", "#e5484d", false);
        rel("kinship", "#d9b64c", false);
        rel("master_disciple", "#4f9df0", true);
        rel("lover", "#f07ab0", false);
        rel("subordinate", "#f29d3f", true);
        rel("custom", "#a86ce0", false);
    }

    private static void rel(String t, String color, boolean directed) {
        REL_META.put(t, new java.util.AbstractMap.SimpleEntry<>(color, directed));
    }

    private static String relLabel(String t) {
        return switch (t) {
            case "belong_to" -> "从属";
            case "ally" -> "结盟";
            case "enemy" -> "敌对";
            case "kinship" -> "亲属";
            case "master_disciple" -> "师徒";
            case "lover" -> "情侣";
            case "subordinate" -> "上下级";
            default -> "自定义";
        };
    }

    /**
     * 组装图数据（对齐方案 4.3）。
     * mode=god → sort 置 null（全量）；mode=timeline → sort 用于时间过滤。
     */
    public GraphResponse build(Long workId, String mode, Integer sort) {
        boolean timeline = "timeline".equalsIgnoreCase(mode);
        int S = timeline ? (sort == null ? Integer.MAX_VALUE : sort) : Integer.MAX_VALUE;

        List<CharacterRow> chars = dao.listCharacters(workId);
        List<Faction> factions = dao.listFactions(workId);
        List<Relationship> rels = dao.listRelationships(workId);

        Map<Long, Faction> factionById = new HashMap<>();
        for (Faction f : factions) factionById.put(f.id(), f);

        List<GraphNode> nodes = new ArrayList<>();
        for (CharacterRow c : chars) {
            if (timeline && c.firstSortOrder() > S) continue; // 时间轴：只见已出场
            Faction fa = c.factionId() == null ? null : factionById.get(c.factionId());
            nodes.add(new GraphNode(
                "c" + c.id(), "character", c.name(),
                c.factionId(), fa == null ? null : fa.name(),
                c.importance(), c.avatarColor(), !"死亡".equals(c.status()),
                c.firstSortOrder(), c.lastActiveSortOrder(),
                (int) Math.round(5 + c.importance() * 25)));
        }
        for (Faction f : factions) {
            if (timeline && f.firstSortOrder() > S) continue;
            Faction parent = f.parentFactionId() == null ? null : factionById.get(f.parentFactionId());
            nodes.add(new GraphNode(
                "f" + f.id(), "faction", f.name(),
                f.parentFactionId(), parent == null ? null : parent.name(),
                f.importance(), f.color(), true,
                f.firstSortOrder(), f.lastActiveSortOrder(),
                (int) Math.round(5 + f.importance() * 25)));
        }

        List<GraphLink> fixed = new ArrayList<>();
        for (Relationship r : rels) {
            if (timeline) {
                if (r.startSortOrder() > S) continue;
                if (r.endSortOrder() != null && r.endSortOrder() < S) continue;
            }
            Map.Entry<String, Boolean> meta = REL_META.get(r.relType());
            String color = meta == null ? "#a86ce0" : meta.getKey();
            boolean directed = meta != null && meta.getValue();
            fixed.add(new GraphLink(
                "r" + r.id(),
                idWithPrefix(r.fromType(), r.fromId()),
                idWithPrefix(r.toType(), r.toId()),
                r.relType(), color, r.strength() * 3,
                directed, relLabel(r.relType()),
                r.startSortOrder(), r.endSortOrder()));
        }

        Integer current = timeline ? S : null;
        Integer metaSort = (current == null || current == Integer.MAX_VALUE) ? null : current;
        GraphResponse.GraphMeta meta = new GraphResponse.GraphMeta(
            chars.size(), factions.size(),
            metaSort);

        return new GraphResponse(nodes, fixed, meta);
    }

    private static String idWithPrefix(String type, Long id) {
        return ("character".equals(type) ? "c" : "f") + id;
    }
}
