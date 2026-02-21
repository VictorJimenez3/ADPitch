/**
 * presage-capture/src/metrics_callback.cpp
 *
 * Extracts physiology metrics from SmartSpectra's MetricsBuffer
 * and writes them to SQLite through the DBWriter.
 *
 * NOTE: The exact field names in MetricsBuffer may vary by SDK version.
 * Check docs.physiology.presagetech.com/cpp for your version's API.
 * The fields below are based on documented capabilities.
 */

#include "metrics_callback.h"
#include <chrono>
#include <glog/logging.h>

absl::Status on_metrics_received(
    const presage::physiology::MetricsBuffer& metrics,
    int64_t timestamp_us,
    DBWriter& db_writer
) {
    // Convert Presage timestamp (microseconds) to UTC milliseconds
    int64_t timestamp_ms = timestamp_us / 1000;

    // If Presage gives relative timestamps, use system clock instead:
    // auto now = std::chrono::system_clock::now();
    // int64_t timestamp_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
    //     now.time_since_epoch()).count();

    // Extract metrics from the buffer
    // NOTE: Adjust these field accessors to match your SmartSpectra SDK version.
    // The .strict().value() pattern is from the docs — it may throw if no data.

    double heart_rate = -1, hrv = -1, breathing_rate = -1;
    double phasic = -1, emotion_score = 0, engagement = -1;
    double blink_rate = -1;
    bool is_talking = false;

    try {
        heart_rate = static_cast<double>(metrics.pulse().strict().value());
    } catch (...) { /* No pulse data this frame */ }

    try {
        breathing_rate = static_cast<double>(metrics.breathing().strict().value());
    } catch (...) { /* No breathing data this frame */ }

    // TODO: Extract these based on your SDK version's MetricsBuffer fields:
    // - hrv (heart rate variability)
    // - phasic (relative blood pressure)
    // - emotion_score (map from Presage's emotional response output)
    // - engagement (derive from blink rate + talk detection + attention)
    // - blink_rate
    // - is_talking

    // Write to SQLite
    db_writer.write_event(
        timestamp_ms,
        heart_rate > 0 ? heart_rate : -1,
        hrv > 0 ? hrv : -1,
        breathing_rate > 0 ? breathing_rate : -1,
        phasic,
        emotion_score,
        engagement,
        blink_rate,
        is_talking
    );

    LOG_EVERY_N(INFO, 5) << "📊 HR=" << heart_rate
                          << " BR=" << breathing_rate
                          << " Emotion=" << emotion_score;

    return absl::OkStatus();
}
