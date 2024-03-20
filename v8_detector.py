from ultralytics import YOLO
import cv2
import requests
import logging
from flask import Flask, jsonify
import threading

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


class ABDManager:
    def __init__(self):
        self.cap = None
        self.model = YOLO("yolov8n.pt")
        self.thread = None
        self.running = False
        self.count = 0

    def run_abd(self):
        self.running = True
        self.cap = cv2.VideoCapture(0)
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
                self.count = self.count + 1
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

                    # If its a person, send a report!
                    print(self.count)
                    if (pred_class == "person") and (self.count % 100 == 0):
                        # send report...
                        payload = {
                            "confidence": box.conf.tolist()[0],
                            "bbox": [xmin, ymin, xmax, ymax],
                            "class": "Person",
                            "lat": 33.953826,
                            "long": -118.396315,
                        }
                        print(payload)
                        insert_url = "http://localhost:3000/model/insert/"

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
                # cv2.imshow("Frame", frame)
            else:
                # cv2.imshow("Frame", frame)
                logging.info("No Detections")

            if cv2.waitKey(1) == ord("q"):
                break
                # Release resources outside the loop
        if self.cap is not None:
            self.cap.release()
            cv2.destroyAllWindows()
            logging.info("ABD run_abd stopped")

    def start(self):
        if not self.running:
            self.thread = threading.Thread(target=self.run_abd)
            self.thread.start()
            logging.info("ABD started")
        else:
            logging.info("ABD is already running...")

    def stop(self):
        if self.running:
            self.running = False
            self.thread.join()
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


if __name__ == "__main__":
    port = 5000  # Default Flask port
    logging.info(f"Starting Flask server on port {port}")
    app.run(debug=True, port=port)
