#pragma once

#include <physiology/modules/messages/metrics.h>
#include "db_writer.h"

/**
 * Called by SmartSpectra ~1/second with new physiology data.
 * Extracts relevant metrics and writes them to SQLite.
 */
absl::Status on_metrics_received(
    const presage::physiology::MetricsBuffer& metrics,
    int64_t timestamp_us,
    DBWriter& db_writer
);
