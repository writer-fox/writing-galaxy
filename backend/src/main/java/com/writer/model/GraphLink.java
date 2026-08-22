package com.writer.model;

/** 图边（对应方案 4.3 links[]） */
public record GraphLink(
    String id,
    String source,         // 节点 id（"c12" / "f3"）
    String target,
    String type,           // rel_type
    String color,
    double width,
    boolean directed,
    String label,
    int startSort,
    Integer endSort
) {}
