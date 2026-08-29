package com.writer.model;

/** 新建势力请求 */
public record CreateFactionRequest(
    String name,
    Long parentFactionId,
    String type,           // 门派/国家/家族/组织
    String description,
    String color,
    Double importance,
    Integer firstSortOrder
) {}
