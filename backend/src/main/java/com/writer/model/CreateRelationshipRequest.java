package com.writer.model;

/** 新建关系请求（带时间维度） */
public record CreateRelationshipRequest(
    Long fromId,
    String fromType,       // character / faction
    Long toId,
    String toType,
    String relType,        // 见方案 4.2.6 枚举
    Double strength,
    Integer startSortOrder,
    Integer endSortOrder,
    String note
) {}
