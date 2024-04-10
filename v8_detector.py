from ultralytics import YOLO
import cv2
import requests
import logging
from flask import Flask, jsonify, Response
import threading
import time
import os

app = Flask(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

THUMBNAIL_SIZE = 500


class ABDManager:
    def __init__(self):
        self.cap = None
        self.model = YOLO("yolov8n.pt")
        self.thread = None
        self.running = False
        self.count = 0
        self.frame = None
        self.image_path = "test.jpeg"
        self.thumb_path = "test_thumb.jpeg"
        self.payload = None

    def get_frames(self):
        while self.frame is None:
            time.sleep(0)
        return self.frame

    def run_abd(self):
        logging.info("ABD run_abd started")
        while self.running:
            ret, frame = self.cap.read()
            if not ret:
                break

            # Perform detection
            results = self.model(frame)

            # Display results
            # results[0].show()  # This method is provided by the ultralytics YOLOv8 packa

            # Assuming 'frame' is your current video frame, and 'result' contains the model predictions
            if len(results[0].boxes) > 0:
                for box in results[0].boxes:
                    # Draw rectangle (bounding box)
                    # print(box)
                    xmin, ymin, xmax, ymax = box.xyxy.tolist()[0]
                    start_point = (int(xmin), int(ymin))
                    end_point = (int(xmax), int(ymax))
                    color = (255, 0, 0)  # Blue color in BGR
                    thickness = 2  # Thickness of 2 px
                    frame = cv2.rectangle(
                        frame, start_point, end_point, color, thickness
                    )
                    pred_class = results[0].names[box.cls.tolist()[0]]

                    if (pred_class == "person"):
                        # IF a person update count
                        print(self.count)
                        self.count = self.count + 1
                        # If we are sure its a person, send a report!
                        if (self.count % 25 == 0):

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
                            thumbnail = cv2.resize(
                                frame,
                                (THUMBNAIL_SIZE, THUMBNAIL_SIZE),
                                interpolation=cv2.INTER_AREA,
                            )
                            cv2.imwrite(self.thumb_path, thumbnail)
                            cv2.imwrite(self.image_path, frame)

                            # TODO: Have JS do this??
                            image_stats = os.stat(self.image_path)
                            thumb_stats = os.stat(self.thumb_path)

                            # send report...
                            self.payload = {
                                "confidence": box.conf.tolist()[0],
                                "bbox": [xmin, ymin, xmax, ymax],
                                "class": "Person",
                                "lat": 33.953826,
                                "long": -118.396315,
                                "image_path": self.image_path,
                                "thumb_path": self.thumb_path,
                                "image_size": float(image_stats.st_size),
                                "thumb_size": float(thumb_stats.st_size)
                            }
                            print(self.payload)

                            insert_url = "http://localhost:3000/model/insert/"
                            response = requests.post(insert_url, json=self.payload)

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
                self.frame = frame
            else:
                self.frame = frame

    def start(self):
        if not self.running:
            self.cap = cv2.VideoCapture(0)  # TODO: Don't hardcode
            self.running = True
            self.thread = threading.Thread(target=self.run_abd)
            self.thread.start()
            logging.info("ABD started")
        else:
            logging.info("ABD is already running...")

    def stop(self):
        if self.running:
            self.running = False
            if self.thread is not None:
                self.thread.join()
            if self.cap is not None:
                self.cap.release()
            logging.info("ABD stopped.")
        else:
            logging.info("ABD is not running...")


abd_manager = ABDManager()


@app.route("/run", methods=["GET"])
def start_abd():
    logging.info("STARTING!")
    abd_manager.start()
    return jsonify({"message": "ABD started."})


@app.route("/stop", methods=["GET"])
def stop_abd():
    abd_manager.stop()
    return jsonify({"message": "ABD stopped."})


def generate_frames():
    while True:
        frame = abd_manager.get_frames()
        ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 20])
        frame_bytes = buffer.tobytes()
        yield (
            b"--frame\r\n" b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )


@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame"
    )


if __name__ == "__main__":
    port = 5005  # Default Flask port
    host = "0.0.0.0"
    logging.info(f"Starting Flask server on port {port}")
    app.run(host=host, debug=True, port=port, threaded=True)
