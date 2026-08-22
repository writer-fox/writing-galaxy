package com.writer.model;

/** 势力（对应 faction 表） */
public record Faction(
    Long id,
    Long workId,
    String name,
    Long parentFactionId,
    String type,
    String description,
    String color,
    double importance,
    int firstSortOrder,
    Integer lastActiveSortOrder
) {}
