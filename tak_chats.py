import { init, Ditto, LiveQueryEventUpdate, Logger, LogLevel, PresenceGraph, TransportConfig, AttachmentFetchEvent } from '@dittolive/ditto'

export async function tak_chats(ditto) {
    subscriptionChat = ditto.store.collection("TAK_Chats").findAll().subscribe()
    liveQueryChat = ditto.store.collection("TAK_Chats").findAll().observeLocal((docs, event) => {
      let updateEvent = event
      if(updateEvent == null){
        console.log("TAK MapItems LiveQueryEventUpdate cast null")
        }else{
          logTime()
          console.log("TAK Chat cnt: " + docs.length + ", " + Object.prototype.toString.call(event))
  
        if(updateEvent.insertions != null){
          console.log("TAK Chat insertions cnt: " + updateEvent.insertions.length)
          updateEvent.insertions.forEach( (index) => {
              let doc = docs[index]
  
              console.log((updateCnt++) + " TAK Chat insertion takUid: " + doc.value.takUid + ", siteId: " + doc.value.siteId + ", _id: " + doc.value._id + ", msg: " + doc.value.msg)
              if(LOG_INFO)
                console.log("TAK Chat data: " + doc.value.msg)
              if(doc.value.isRemoved){
                  console.log("TAK Chat insertion REMOVED: " + doc.value.takUid)
              }
          });
        }
        
        if(updateEvent.updates != null){
          console.log("TAK Chat updates cnt: " + updateEvent.updates.length)
          updateEvent.updates.forEach( (index) => {
            let doc = docs[index]
  
            console.log((updateCnt++) + " TAK Chat update takUid: " + doc.value.takUid + ", siteId: " + doc.value.siteId + ", _id: " + doc.value._id + ", msg: " + doc.value.msg)
  
            if(doc.value.isRemoved){
                console.log("TAK Chat update REMOVED: " + doc.value.takUid)
            }
        });
      }
    
      if(updateEvent.deletions != null){
        console.log("TAK Chat deletions cnt: " + updateEvent.deletions.length)
        // updateEvent.deletions.forEach( (index) => {
        //         let doc = docs[index]
        //         console.log((updateCnt++) + " TAK Chat deletion: " + doc.id)
        //     });
          }
      }    
    })
}