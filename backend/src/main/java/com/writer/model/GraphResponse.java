package com.writer.model;

import java.util.List;

/** 图数据响应（方案 4.3 /graph?mode=&sort=） */
public record GraphResponse(
    List<GraphNode> nodes,
    List<GraphLink> links,
    GraphMeta meta
) {
    public record GraphMeta(
        int totalCharacters,
        int totalFactions,
        Integer currentSort
    ) {}
}
