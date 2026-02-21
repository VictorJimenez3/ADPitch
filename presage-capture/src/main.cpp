/**
 * presage-capture/src/main.cpp
 *
 * Entry point for the Presage camera capture module.
 * Initializes SmartSpectra SDK, opens camera, and writes
 * physiology metrics to SQLite via callbacks.
 *
 * Usage:
 *   ./saleslens_capture --api_key=YOUR_KEY --session_id=abc123
 *
 * The --session_id should come from the api-server when a
 * session is started. For testing, use any string.
 */

#include <smartspectra/container/foreground_container.hpp>
#include <smartspectra/container/settings.hpp>
#include <physiology/modules/messages/metrics.h>
#include <glog/logging.h>
#include <iostream>
#include <string>

#include "db_writer.h"
#include "metrics_callback.h"

using namespace presage::smartspectra;

int main(int argc, char** argv) {
    google::InitGoogleLogging(argv[0]);
    FLAGS_alsologtostderr = true;

    // Parse command line args
    std::string api_key;
    std::string session_id;
    std::string db_path = "../sync-engine/data/saleslens.db";

    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg.find("--api_key=") == 0) api_key = arg.substr(10);
        if (arg.find("--session_id=") == 0) session_id = arg.substr(13);
        if (arg.find("--db_path=") == 0) db_path = arg.substr(10);
    }

    if (api_key.empty() || session_id.empty()) {
        std::cerr << "Usage: ./saleslens_capture --api_key=KEY --session_id=ID [--db_path=PATH]\n";
        return 1;
    }

    // Initialize SQLite writer
    DBWriter db_writer(db_path, session_id);

    // Configure SmartSpectra for continuous measurement
    container::settings::Settings<
        container::settings::OperationMode::Spot,
        container::settings::IntegrationMode::Rest
    > settings;

    settings.video_source.device_index = 0;  // Default camera (change for external)
    settings.integration.api_key = api_key;
    settings.headless = false;  // Show GUI overlay for debugging (set true in production)

    // Create the container
    auto container = std::make_unique<
        container::CpuSpotRestForegroundContainer
    >(settings);

    // Register the metrics callback — this fires ~1/second with physiology data
    auto status = container->SetOnCoreMetricsOutput(
        [&db_writer](const presage::physiology::MetricsBuffer& metrics, int64_t timestamp_us) {
            return on_metrics_received(metrics, timestamp_us, db_writer);
        }
    );

    if (!status.ok()) {
        LOG(ERROR) << "Failed to set metrics callback: " << status.message();
        return 1;
    }

    LOG(INFO) << "🎥 SalesLens capture started for session: " << session_id;
    LOG(INFO) << "   Press Ctrl+C to stop.";

    // Initialize and run (blocks until stopped)
    auto init_status = container->Init();
    if (!init_status.ok()) {
        LOG(ERROR) << "Failed to initialize: " << init_status.message();
        return 1;
    }

    container->Run();

    return 0;
}
