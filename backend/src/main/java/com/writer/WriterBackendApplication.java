package com.writer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;

@SpringBootApplication
public class WriterBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(WriterBackendApplication.class, args);
    }
}
