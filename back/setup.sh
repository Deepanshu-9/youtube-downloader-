#!/bin/bash

# Update the package list and install necessary dependencies
apt-get update -y

# Install ffmpeg and python3 dependencies for yt-dlp
apt-get install -y ffmpeg python3 python3-pip

# Install yt-dlp using pip3
pip3 install yt-dlp

# Verify installation by printing the paths of yt-dlp and ffmpeg
which yt-dlp
which ffmpeg
