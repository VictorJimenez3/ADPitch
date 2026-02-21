cmake_minimum_required(VERSION 3.16)
project(saleslens_capture)

set(CMAKE_CXX_STANDARD 17)

find_package(SmartSpectra REQUIRED)
find_package(OpenCV REQUIRED)

# SQLite3
find_library(SQLITE3_LIB sqlite3)

add_executable(saleslens_capture
    src/main.cpp
    src/metrics_callback.cpp
    src/db_writer.cpp
)

target_include_directories(saleslens_capture PRIVATE include)

target_link_libraries(saleslens_capture
    SmartSpectra::Container
    ${OpenCV_LIBS}
    ${SQLITE3_LIB}
    glog::glog
)
