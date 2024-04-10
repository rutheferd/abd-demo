# Ditto AI Table Top Demo On-Board UxV Software
This repo contains two components necessary for the Ditto AI Table Top Demo. 

1. Common Operational Database (COD) Stub Service (NodeJS)
2. Automatic Target Recognition (ATR) Service

These services are meant to be deployed as a component of the larger table top demo Infrastructure as Code (IaC), however can be operated on a local machine for testing!

## How does it work?
In order to showcase ditto's integration with AI capabilities we have taken one of the most common languages, Python, and combined it with Ditto running inside NodeJS. 

## COD Stub Features

### Insert Contact Report
This call will insert a provided contact report into the TAK Chat ditto collection and a processed image (+ thumbnail) into the TAK Attachments ditto collection.
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

### Start ATR Ditto Update
This call will trigger the `startATR()` function which will invoke a ditto update with a status property of `"start"`.
- **URL**: `/model/start`
- **Method**: POST
- **Sample Call**: 
  ```curl
  curl -X POST http://yourserver.com/model/start/ 
  ```

### Stop ATR Ditto Update
This call will trigger the `stopATR()` function which will invoke a ditto update with a status property of `"stop"`.
- **URL**: `/model/stop`
- **Method**: POST
- **Sample Call**: 
  ```curl
  curl -X POST http://yourserver.com/model/stop/ 
  ```

### 🚧 Update ATR Model 🚧
This call will reprogram the onboard computer vision model with the provided updates. The existing model parameters will be mapped and replace with provided parameters.
- **URL**: `/model/update/:id`
- **URL Params**: `id=[string]`
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
    "param1": <float>,
    ...
    "paramN": <float>
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

To install COD_Stub dependencies:

```zsh
npm install
```

This will install the packages defined in the `package.json` file in the repo.

To install ATR dependencies:

```zsh
python -m pip install -r requirements.txt
```

This assumes that you have a python virtual environment (don't install globally 😅). 

## How to Run

To start COD_Stub:

```zsh
node ditto_api.js
```

To start ATR:

```zsh
python v8_detector.py
```

To run a quick sanity check run:

```zsh
python run_demo.py
```

This will the start status via the COD_Stub API which will start the ATR via the ATR API. It will run for five seconds with the local camera being used to process frames. 

Contact reports will be logged into the NodeJS terminal session, and images will be save to the local directory.