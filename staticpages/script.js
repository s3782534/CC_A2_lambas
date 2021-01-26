function formSubmit(){
  var validS3Allocation = false;
  var tempS3URL = null;
  var firstSubmit = {name:document.forms["gameUpload"]["gameName"]};
  var xhttp1 = new XMLHttpRequest();
  xhttp1.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var response = JSON.parse(this.responseText);
      tempS3URL = response["s3URL"];
      validS3Allocation = true;
    } else {
      validS3Allocation = false;
    }
  };
  xhttp1.open("Post", "demo_get.asp", true);
  xhttp1.send(JSON.stringify(firstSubmit));

  // If s3 wasn't allocated, first submit was incorrect and can't proceed
  if (validS3Allocation == false){
      // add redirect to error page or something
      return;
  }

  // Upload file to s3 url
  var validS3Upload = false;
  var secondSubmit = {gameZip:document.forms["gameUpload"]["gameZip"]};
  var xhttp2 = new XMLHttpRequest();
  xhttp2.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var response = JSON.parse(this.responseText);
      tempS3URL = response["s3URL"];
      validS3Allocation = true;
    } else {
      validS3Allocation = false;
    }
  };
  xhttp2.open("Post", "demo_get.asp", true);
  xhttp2.send(JSON.stringify(firstSubmit));
}