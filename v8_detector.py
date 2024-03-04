from ultralytics import YOLO
import cv2
from pytube import YouTube
import requests

DO_DOWNLOAD = False


def Download(link):
    youtubeObject = YouTube(link)
    youtubeObject = youtubeObject.streams.get_lowest_resolution()
    try:
        youtubeObject.download(
            output_path="/Users/austinruth/Documents/repos/diu-mach-1/",
            filename="my_video.mp4",
        )
        print("Download is completed successfully")
    except:
        print("An error has occurred")


if DO_DOWNLOAD:
    link = "https://www.youtube.com/watch?v=W-o3w3MA-Tc"
    Download(link)


###
# Make this an API
###


# Load a pretrained model
model = YOLO("yolov8n.pt")

# Load video
# cap = cv2.VideoCapture("my_video.mp4")
cap = cv2.VideoCapture(0)
count = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # Perform detection
    results = model(frame)

    # Display results
    # results[0].show()  # This method is provided by the ultralytics YOLOv8 packa

    # Assuming 'frame' is your current video frame, and 'result' contains the model predictions
    if len(results[0].boxes) > 0:
        count = count + 1
        for box in results[0].boxes:
            # Draw rectangle (bounding box)
            # print(box)
            xmin, ymin, xmax, ymax = box.xyxy.tolist()[0]
            start_point = (int(xmin), int(ymin))
            end_point = (int(xmax), int(ymax))
            color = (255, 0, 0)  # Blue color in BGR
            thickness = 2  # Thickness of 2 px
            frame = cv2.rectangle(frame, start_point, end_point, color, thickness)
            pred_class = results[0].names[box.cls.tolist()[0]]

            # If its a person, send a report!
            print(count)
            if (pred_class == "person") and (count % 100 == 0):
                # send report...
                payload = {
                    "confidence": box.conf.tolist()[0],
                    "bbox": [xmin, ymin, xmax, ymax],
                    "class": "Person",
                    "lat": 33.953826,
                    "long": -118.396315
                }
                print(payload)
                insert_url = 'http://localhost:3000/model/insert/'

                # Send the POST request
                response = requests.post(insert_url, json=payload)

            # Put the probability label
            label = f"{pred_class}-{box.conf.tolist()[0]:.2f}"
            frame = cv2.putText(
                frame,
                label,
                (int(xmin), int(ymin) - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                color,
                2,
            )
        cv2.imshow("Frame", frame)
    else:
        cv2.imshow("Frame", frame)

    if cv2.waitKey(1) == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
