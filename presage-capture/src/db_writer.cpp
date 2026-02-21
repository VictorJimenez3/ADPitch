/**
 * presage-capture/src/db_writer.cpp
 *
 * SQLite writer for physiology events. Shares the same DB file
 * as the transcription module — WAL mode enables concurrent writes.
 */

#include "db_writer.h"
#include <glog/logging.h>
#include <iostream>

DBWriter::DBWriter(const std::string& db_path, const std::string& session_id)
    : session_id_(session_id), db_(nullptr), insert_stmt_(nullptr)
{
    int rc = sqlite3_open(db_path.c_str(), &db_);
    if (rc != SQLITE_OK) {
        LOG(FATAL) << "Cannot open database: " << sqlite3_errmsg(db_);
    }

    // Enable WAL mode for concurrent access
    sqlite3_exec(db_, "PRAGMA journal_mode=WAL;", nullptr, nullptr, nullptr);
    sqlite3_exec(db_, "PRAGMA busy_timeout=5000;", nullptr, nullptr, nullptr);

    // Prepare the insert statement (reused for every write)
    const char* sql =
        "INSERT INTO physiology_events "
        "(session_id, timestamp_ms, heart_rate, hrv, breathing_rate, "
        " phasic, emotion_score, engagement, blink_rate, is_talking) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    rc = sqlite3_prepare_v2(db_, sql, -1, &insert_stmt_, nullptr);
    if (rc != SQLITE_OK) {
        LOG(FATAL) << "Failed to prepare statement: " << sqlite3_errmsg(db_);
    }

    LOG(INFO) << "✅ DBWriter initialized for session: " << session_id_;
}

DBWriter::~DBWriter() {
    if (insert_stmt_) sqlite3_finalize(insert_stmt_);
    if (db_) sqlite3_close(db_);
}

void DBWriter::write_event(
    int64_t timestamp_ms,
    double heart_rate,
    double hrv,
    double breathing_rate,
    double phasic,
    double emotion_score,
    double engagement,
    double blink_rate,
    bool is_talking
) {
    sqlite3_reset(insert_stmt_);

    sqlite3_bind_text(insert_stmt_, 1, session_id_.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_int64(insert_stmt_, 2, timestamp_ms);

    // Bind doubles — use NULL for invalid values (-1 means no data)
    auto bind_double = [this](int idx, double val) {
        if (val >= 0) sqlite3_bind_double(insert_stmt_, idx, val);
        else sqlite3_bind_null(insert_stmt_, idx);
    };

    bind_double(3, heart_rate);
    bind_double(4, hrv);
    bind_double(5, breathing_rate);
    bind_double(6, phasic);
    sqlite3_bind_double(insert_stmt_, 7, emotion_score);  // Can be negative (emotion)
    bind_double(8, engagement);
    bind_double(9, blink_rate);
    sqlite3_bind_int(insert_stmt_, 10, is_talking ? 1 : 0);

    int rc = sqlite3_step(insert_stmt_);
    if (rc != SQLITE_DONE) {
        LOG(WARNING) << "Failed to insert physiology event: " << sqlite3_errmsg(db_);
    }
}
