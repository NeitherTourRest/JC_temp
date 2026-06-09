package com.journeycraft.jc.common.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
public class FileUploadController {

    // Store uploads in user's home directory to avoid Tomcat temp path issues
    private static final String UPLOAD_DIR = System.getProperty("user.home") + "/journeycraft-uploads";
    private static final long MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.error("File is empty"));
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.ok(ApiResponse.error("File too large. Max 50MB"));
        }

        try {
            String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
            String ext = getExtension(file.getOriginalFilename());
            String filename = UUID.randomUUID().toString() + ext;
            Path dirPath = Paths.get(UPLOAD_DIR, dateStr);
            Files.createDirectories(dirPath);
            Path filePath = dirPath.resolve(filename);
            file.transferTo(filePath.toFile());

            String url = "/uploads/" + dateStr + "/" + filename;
            String contentType = file.getContentType();

            return ResponseEntity.ok(ApiResponse.success(Map.of(
                    "url", url,
                    "filename", file.getOriginalFilename(),
                    "size", file.getSize(),
                    "contentType", contentType != null ? contentType : "application/octet-stream"
            )));
        } catch (IOException e) {
            return ResponseEntity.ok(ApiResponse.error("Upload failed: " + e.getMessage()));
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf("."));
    }
}