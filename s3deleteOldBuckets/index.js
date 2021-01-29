// Load the SDK
var AWS = require('aws-sdk');

const tempUploadDb = "game_temp_upload"

exports.handler =  function(event, context) {
    var dynamoDb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

    var scanParams = {
        TableName: tempUploadDb
    }

    var allTempEntries = dynamoDb.scan(scanParams, function(err, data){
        if (err){
            console.log (err, err.stack);
        } else {
            var items = data["Items"];
            // console.log(items);
            for (item of items){
                var bucketName = item["bucket_name"]["S"];
                // variable for tracking if entry and bucket are to be deleted
                var toDelete = false;
                // Check if completed
                if (item["status"] && item["status"]["S"] === "completed"){
                    console.log(bucketName + " is completed and to be deleted")
                    toDelete = true;
                // Check if expired
                } else if (item["expiry_time"] && item["expiry_time"]["N"] < Date.now()){
                    console.log(bucketName + " is past expiry and to be deleted")
                    toDelete = true;
                } else {
                    console.log(bucketName + " is not yet expired so will remain")
                }


                if (toDelete){
                    // delete bucket
                    if (deleteBucket(bucketName)){
                        // delete db entry
                        deleteDbEntry(bucketName, dynamoDb);
                    }
                }
            }
        }
    })

}

function deleteDbEntry(bucketName, dynamoDb){
    var deleteParams = {
        Key: {
            "bucket_name": {
                S: bucketName
            }
        },
        TableName: tempUploadDb
    }
    dynamoDb.deleteItem(deleteParams, function(err,data){
        if (err){
            console.log (err, err.stack);
            console.log("Unsuccessful deletion of db entry for " + bucketName);
            return;
        } else {
            console.log("Successful deletion of db entry for " + bucketName);
            return;
        }
    })
}

function deleteBucket(bucketName){
    var s3 = new AWS.S3({apiVersion: '2006-03-01'});

    var listParams = {
        Bucket: bucketName
    }
    s3.listObjectsV2(listParams, function(err, data){
        if (err) {
            console.log (err, err.stack);
            console.log("Unsuccessful action of listing objects in temp bucket " + bucketName);
            return;
        } else {
            console.log("Successful action of listing objects in temp bucket " + bucketName);
            // Variable to hold object keys for use in deleteObjects request
            var objectKeys = [];
            var objects = data["Contents"];
            // Go through each object and add its key to the deletion pile
            for (object of objects){
                console.log(object);
                var key = object["Key"];
                objectKeys.push({Key:key});
            }
            var deleteParams = {
                Bucket: bucketName,
                Delete: {
                    Objects: objectKeys
                }
            }
            console.log("Delete params: " + JSON.stringify(deleteParams))
            // Delete all objects in the bucket
            s3.deleteObjects(deleteParams, function(err, data){
                if (err){
                    console.log (err, err.stack);
                    console.log("Unsuccessful deletion of bucket objects for " + bucketName);
                    return;

                } else {
                    console.log("Successful deletion of bucket objects for " + bucketName);
                    // Delete the bucket
                    var deleteBucketParams = {
                        Bucket: bucketName
                    }
                    s3.deleteBucket(deleteBucketParams, function (err,data){
                        if (err) {
                            console.log (err, err.stack);
                            console.log("Unsuccessful deletion of bucket " + bucketName);
                            return;
                        } else {
                            console.log("Successful deletion of bucket objects " + bucketName);
                            return true;
                        }
                    })
                }
            })
        }
    })
}