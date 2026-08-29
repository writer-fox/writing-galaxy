package com.writer.model;

/** 更新人物请求（可空字段 = 不修改） */
public record UpdateCharacterRequest(
    String name,
    String aliases,
    Long factionId,
    String role,
    String description,
    String avatarColor,
    Double importance,
    Integer firstSortOrder,
    String status,
    Boolean confirmed
) {}
