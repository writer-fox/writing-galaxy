package com.writer.model;

/** 人物（对应 character 表），importance 影响 3D 节点大小 */
public record CharacterRow(
    Long id,
    Long workId,
    String name,
    String aliases,       // JSON 数组字符串
    Long factionId,
    String role,
    String description,
    String avatarColor,
    double importance,
    int firstSortOrder,
    Integer lastActiveSortOrder,
    String status,
    boolean confirmed
) {}
