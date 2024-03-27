import { startATR, stopATR } from "./ditto_api.js"

let presenceObserver;
let LOG_INFO = true;
let LOG_DEBUG = false;
let CONNECT_BIGPEER = false;
let FETCH_FILES = true;
let subscriptionChat;
let liveQueryChat;

export async function tak_chats(ditto) {
  let updateCnt = 1;
  subscriptionChat = ditto.store.collection("TAK_Chats").findAll().subscribe();
  liveQueryChat = ditto.store
    .collection("TAK_Chats")
    .findAll()
    .observeLocal((docs, event) => {
      let updateEvent = event;
      if (updateEvent == null) {
        console.log("TAK MapItems LiveQueryEventUpdate cast null");
      } else {
        logTime();
        console.log(
          "TAK Chat cnt: " +
            docs.length +
            ", " +
            Object.prototype.toString.call(event)
        );

        if (updateEvent.insertions != null) {
          console.log(
            "TAK Chat insertions cnt: " + updateEvent.insertions.length
          );
          updateEvent.insertions.forEach((index) => {
            let doc = docs[index];

            // Authenticated Start Message
            if (doc.value.msg == "start 1a2b3c") {
                let result = startATR();
                console.log(result)
            }

            // Authenticated Stop Message
            if (doc.value.msg == "stop 1a2b3c") {
                let result = stopATR();
                console.log(result)
            }

            console.log(
              updateCnt++ +
                " TAK Chat insertion takUid: " +
                doc.value.takUid +
                ", siteId: " +
                doc.value.siteId +
                ", _id: " +
                doc.value._id +
                ", msg: " +
                doc.value.msg
            );
            if (LOG_INFO) console.log("TAK Chat data: " + doc.value.msg);
            if (doc.value.isRemoved) {
              console.log("TAK Chat insertion REMOVED: " + doc.value.takUid);
            }
          });
        }

        if (updateEvent.updates != null) {
          console.log("TAK Chat updates cnt: " + updateEvent.updates.length);
          updateEvent.updates.forEach((index) => {
            let doc = docs[index];

            // Authenticated Start Message
            if (doc.value.msg == "start 1a2b3c") {
                let result = startATR();
                console.log(result)
            }

            // Authenticated Stop Message
            if (doc.value.msg == "stop 1a2b3c") {
                let result = stopATR();
                console.log(result)
            }

            console.log(
              updateCnt++ +
                " TAK Chat update takUid: " +
                doc.value.takUid +
                ", siteId: " +
                doc.value.siteId +
                ", _id: " +
                doc.value._id +
                ", msg: " +
                doc.value.msg
            );

            if (doc.value.isRemoved) {
              console.log("TAK Chat update REMOVED: " + doc.value.takUid);
            }
          });
        }

        if (updateEvent.deletions != null) {
          console.log(
            "TAK Chat deletions cnt: " + updateEvent.deletions.length
          );
        }
      }
    });
}

function logTime() {
  //TODO time
  console.log("------------------------- " + new Date().toISOString());
}