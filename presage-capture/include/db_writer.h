#pragma once

#include <string>
#include <sqlite3.h>

/**
 * Writes physiology events to the shared SQLite database.
 * Uses WAL mode for concurrent access with the transcription module.
 */
class DBWriter {
public:
    DBWriter(const std::string& db_path, const std::string& session_id);
    ~DBWriter();

    void write_event(
        int64_t timestamp_ms,
        double heart_rate,
        double hrv,
        double breathing_rate,
        double phasic,
        double emotion_score,
        double engagement,
        double blink_rate,
        bool is_talking
    );

private:
    sqlite3* db_;
    sqlite3_stmt* insert_stmt_;
    std::string session_id_;
};
