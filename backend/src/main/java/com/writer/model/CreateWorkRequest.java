package com.writer.model;

/** 新建作品请求 */
public record CreateWorkRequest(
    String title,
    String genre,
    String summary
) {}
