import torch
import cv2
import numpy as np
from models.common import DetectMultiBackend
from utils.general import non_max_suppression, scale_boxes
from utils.augmentations import letterbox
from utils.plots import Annotator, colors

# Initialize the model
def load_model(weights='yolov9-c.pt', device='', imgsz=640):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = DetectMultiBackend(weights, device=device, dnn=False, data='data/coco.yaml', fp16=False)
    stride, names, pt = model.stride, model.names, model.pt
    imgsz = letterbox([imgsz, imgsz], stride=stride, auto=True)[0]
    return model, device, stride, names, imgsz

# Process and display the video
def process_video(video_path, model, device, stride, names, imgsz):
    cap = cv2.VideoCapture(video_path)
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Preprocess the image
        img = letterbox(frame, imgsz, stride=stride, auto=True)[0]
        img = img[:, :, ::-1].transpose(2, 0, 1)  # BGR to RGB, to 3x416x416
        img = np.ascontiguousarray(img)

        # Inference
        img = torch.from_numpy(img).to(device).float()
        img /= 255.0  # 0 - 255 to 0.0 - 1.0
        if img.ndimension() == 3:
            img = img.unsqueeze(0)
        pred = model(img, augment=False, visualize=False)

        # Apply NMS
        pred = non_max_suppression(pred[0][0], 0.25, 0.45, classes=None, agnostic=False, max_det=1000)

        # Process detections
        for i, det in enumerate(pred):  # detections per image
            if len(det):
                # Rescale boxes from img_size to im0 size
                det[:, :4] = scale_boxes(img.shape[2:], det[:, :4], frame.shape).round()

                # Write results
                for *xyxy, conf, cls in reversed(det):
                    label = f'{names[int(cls)]} {conf:.2f}'
                    annotator = Annotator(frame, line_width=2, example=str(names))
                    annotator.box_label(xyxy, label, color=colors(int(cls), True))
            cv2.imshow('frame', frame)
            if cv2.waitKey(1) == ord('q'):  # Press Q to stop
                break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    model, device, stride, names, imgsz = load_model()
    process_video('path/to/your/video.mp4', model, device, stride, names, imgsz)
