package com.writer.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * 确保 SQLite 数据文件所在目录存在
 * （sqlite-jdbc 不会自动创建父目录）。
 */
@Configuration
public class SqliteBootstrap {

    @PostConstruct
    public void ensureDataDir() {
        try {
            Files.createDirectories(Paths.get("data"));
        } catch (Exception e) {
            throw new IllegalStateException("无法创建 SQLite 数据目录", e);
        }
    }
}
