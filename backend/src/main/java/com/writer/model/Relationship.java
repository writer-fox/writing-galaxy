package com.writer.model;

/** 关系（对应 relationship 表），带时间维度 */
public record Relationship(
    Long id,
    Long workId,
    Long fromId,
    String fromType,
    Long toId,
    String toType,
    String relType,
    double strength,
    int startSortOrder,
    Integer endSortOrder,
    String note,
    boolean confirmed
) {}
