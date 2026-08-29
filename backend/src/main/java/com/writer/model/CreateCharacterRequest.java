package com.writer.model;

/** 新建人物请求 */
public record CreateCharacterRequest(
    String name,
    String aliases,        // JSON 数组字符串，如 ["小明","明哥"]
    Long factionId,
    String role,           // 主角/配角/反派/路人
    String description,
    String avatarColor,
    Double importance,     // 0~1，影响节点大小
    Integer firstSortOrder,
    String status          // 存活/死亡/退场
) {}
