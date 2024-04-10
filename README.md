# Ditto AI Table Top Demo On-Board UxV Software
This repo contains two components necessary for the Ditto AI Table Top Demo. 

1. Common Operational Database (COD) Stub Service (NodeJS)
2. Automatic Target Recognition (ATR) Service

These services are meant to be deployed as a component of the larger table top demo Infrastructure as Code (IaC), however can be operated on a local machine for testing!

## How does it work?
In order to showcase ditto's integration with AI capabilities we have taken one of the most common languages, Python, and combined it with Ditto running inside NodeJS. 

## COD Stub Features

1. TAK + Ditto Attachment Insert (For contact report images)
2. TAK Chat + Ditto Document Insert (For Start/Stop and Contact Report)
3. 

### Insert Contact Report
This call will insert a provided contact report into the TAK Chat ditto collection and a processed image into the TAK Attachments ditto collection.
- **URL**: `/model/insert`
- **Method**: POST
- **Sample Call**: 
  ```curl
    curl -X POST http://yourserver.com/model/insert/ \
        -H "Content-Type: application/json" \
        -d @sampleData.json
  ```
- **Sample Data**
  ```json
    payload = {
        "confidence": <float>,
        "bbox": Array<[xmin, ymin, xmax, ymax]>,
        "class": <string>,
        "lat": <float>,
        "long": <float>,
        "image_path": <string>,
        "thumb_path": <string>,
        "image_size": <float>,
        "thumb_size": <float>
    }
  ```


## ATR Features
The ATR will consume a video feed from connected cameras and use a computer vision model to detect objects within the frame. In the current implementation it will count the number of `Person` detections that are made and will send a contact report and image via the COD Stub API every count of 25.

The frame will include all detection boxes + (label and confidence) drawn by the algorithm.

### Start ATR
This call will start the ATR process. 
- **URL**: `/run`
- **Method**: GET
- **Sample Call**: 
  ```curl
  curl -X GET "http://127.0.0.1:5000/run"
  ```

### Stop ATR
This call will stop the ATR process.
- **URL**: `/run`
- **Method**: GET
- **Sample Call**: 
  ```curl
  curl -X GET "http://127.0.0.1:5000/stop"
  ```

### Video Feed
This call will present a video feed for images processed by the ATR. `index.html` has been provided for example.
- **URL**: `/video_feed`
- **Method**: GET
- **Sample Call**: 
  In browser: `http://127.0.0.1:5000/video_feed`

## Authentication Configuration

## How to Install

In order to successfully run the COD_Stub with 

## How to Run
