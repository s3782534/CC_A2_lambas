
const getUploadLinkURL = "https://6kd3dqvw7l.execute-api.us-east-1.amazonaws.com/getsignedurl";

// function uploadFile(response);

function formSubmit(){
  console.log("hey");
  // var validS3Allocation = false;
  // var tempS3URL = null;
  var firstSubmit = {"name":String(document.forms["gameUpload"]["gameName"]["value"])};
  console.log(firstSubmit);
  var xhttp1 = new XMLHttpRequest();
  xhttp1.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        // var response = JSON.parse(this.responseText);
        // tempS3URL = response["s3URL"];
        // validS3Allocation = true;
        console.log(this.responseText);
    } else {
      // validS3Allocation = false;
    }
  };
  xhttp1.open("POST", getUploadLinkURL, false);
  xhttp1.setRequestHeader("Content-Type", "application/json");
  xhttp1.send(JSON.stringify(firstSubmit));
  // xhttp1.send("yoyo");
  // fetch(getUploadLinkURL, {
  //   method: "POST",
  //   body: JSON.stringify(firstSubmit),
  // }).then(response => console.log(response.json()))
  // .catch(function(error){
  //   console.log('Request failed', error);
  // })
  // If s3 wasn't allocated, first submit was incorrect and can't proceed
  // if (validS3Allocation == false){
  //     // add redirect to error page or something
  //     return;
  // }
}

function uploadFile(response){
  console.log(response);
  // Upload file to s3 url
  // var validS3Upload = false;
  // var secondSubmit = {gameZip:document.forms["gameUpload"]["gameZip"]};
  // var xhttp2 = new XMLHttpRequest();
  // xhttp2.onreadystatechange = function() {
  //   if (this.readyState == 4 && this.status == 200) {
  //     var response = JSON.parse(this.responseText);
  //     tempS3URL = response["s3URL"];
  //     validS3Allocation = true;
  //   } else {
  //     validS3Allocation = false;
  //   }
  // };
  // xhttp2.open("Post", "demo_get.asp", true);
  // xhttp2.send(JSON.stringify(firstSubmit));
}