package com.writer.model;

/** 图节点（对应方案 4.3 nodes[]） */
public record GraphNode(
    String id,
    String type,           // character / faction
    String name,
    Long factionId,
    String factionName,
    double importance,
    String color,
    boolean alive,
    int firstSort,
    Integer lastActiveSort,
    int size
) {}
