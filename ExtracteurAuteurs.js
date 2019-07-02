/*
    Extracteur Unpaywall, v1.2, 2019-06-13
    Évaluer la proportion des publications en libre accès parmi une liste de DOI
    Copyright (C) 2018-2019 - Romain Boistel, Frédérique Bordignon, Philippe Gambette

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

"use strict";
$(document).ready(function(){
// author list
var author = [];

// Index of the latest author we tried to test
var lastSentQuery = -1;

// Index of the latest author we managed to test
var lastReceivedQuery = -1;

// Information about the latest author we tested
var info = new Object();

// Timer to regularly launch queries
var timer = "";

// Result
var result = [];
var oaByYear = new Object();
var publicationsByYear = new Object();
var graphDisplayed = false;

$("#send").on("click",function(){
   // Reinitialize lastSentQuery, lastReceivedQuery and info
   lastSentQuery = -1;
   lastReceivedQuery = -1;
   
   // Reinitialize the table
   result = [];
   
   // Extract the required field list
   result[0] = $("#champsAuteurs").val().split(",");
   $("#results").html('<tr id="titleRow"></tr>');
   result[0].forEach(function(col){
      $("#titleRow").append("<th>"+col+"</th>");
   });
   
   // Extract the list of all authors of the structure
   var url = "https://api.archives-ouvertes.fr/search/?q=*:*&rows=0&facet=true&facet.field=structHasAuthId_fs&facet.prefix="+$("#structure").val()+"_&wt=json"
   $.get(url).done(authorList)
   console.log(url)
})


function authorList(data){
   data.facet_counts.facet_fields.structHasAuthId_fs.forEach(function(item){
      if(typeof(item)=="string"){
         var authorInfo = item.split("_");
         console.log(authorInfo);
         if(authorInfo[4] != undefined){
            author.push(authorInfo[4])
         }
      }      
   })
   console.log(author);
   //Test a new author every second, in case the previous test was finished
   timer = setInterval(sendQuery,3000);

}

function sendQuery(){
   // Test the next author if the previous one was already tested
   if(lastSentQuery==lastReceivedQuery){      
      // Reinitialize the object to store information about the next publication
      info = new Object();

      // Send a new query
      lastSentQuery += 1;
      
      if(lastSentQuery == author.length){
         // All author have been sent, stop sending queries
         clearInterval(timer);
         $("#progress").html("100");
      } else {
         // Send the next author to Unpaywall
         $.get("https://api.archives-ouvertes.fr/ref/author/?wt=json&q=docid:%22" + author[lastSentQuery] + "%22&fl=" + $("#champsAuteurs").val())
          .always(receiveHal);
      }
   }
}

// Save data received from HAL
function receiveHal(data){
   // Add a new row to the table
   var row = "";
   var resultRow = [];
   result[0].forEach(function(key){
      row += "<td>"+data.response.docs[0][key]+"</td>"
      resultRow.push(data.response.docs[0][key])
   })
   $("#results").find("tbody").append("\n<tr id=\"" + author[lastSentQuery] + "\">" + row + "</tr>");
   result[lastSentQuery+1] = resultRow;

   /*
   if(data.response.docs.length>0){
      // HAL has found the DOI
      info.halNb = data.response.numFound;
      info.halId = '<a href="'+data.response.docs[0].uri_s+'">'+data.response.docs[0].halId_s+"</a>";
      info.linkExtId = data.response.docs[0].linkExtId_s;
      info.linkExtUrl = data.response.docs[0].linkExtUrl_s;
      if(data.response.docs[0].linkExtUrl_s!=undefined){
         info.linkExtUrl = "<a href=\""+data.response.docs[0].linkExtUrl_s+"\">"+data.response.docs[0].linkExtUrl_s+"</a>";
      }
      if(data.response.docs[0].fileMain_s!=undefined){
         info.fileMain = "<a href=\""+data.response.docs[0].fileMain_s+"\">"+data.response.docs[0].fileMain_s+"</a>";
      }
      if(info.year==undefined){
         info.year = data.response.docs[0].producedDateY_i;
      }
   }
   
   // Prepare values for the next table row to be added
   var col3 = "non";
   if(info.is_oa){col3 = "oui";}

   var col4 = "non";
   if(info.journal_is_oa){col4 = "oui";}

   var col5 = "non";
   if(info.journal_is_in_doaj){col5 = "oui";}

   var col2 = "non-OA";
   if((col3 == "oui")||(col4 == "oui")||(col5 == "oui")||(info.best_oa_location != undefined)||((info.linkExtId != undefined)&&(info.linkExtId != "istex"))||(info.fileMain != undefined)){
      col2 = "OA";
      // increase the number of open access publications found
      oa += 1;
   }
   
   // Add a new row to the table
   $("#results").find("tbody").append("\n<tr>"
   +"<td><small><a href=\"http://dx.doi.org/"+author[lastSentQuery]+"\">"+author[lastSentQuery]+"</a></small></td>"
   +"<td>"+col2+"</td>"
   +"<td>"+col3+"</td>"
   +"<td>"+col4+"</td>"
   +"<td>"+col5+"</td>"
   +"<td>"+info.best_oa_location+"</td>"
   +"<td>"+info.halId+"</td>"
   +"<td>"+info.halNb+"</td>"
   +"<td>"+info.linkExtId+"</td>"
   +"<td><small>"+info.linkExtUrl+"</small></td>"
   +"<td><small>"+info.fileMain+"</small></td>"
   +"<td>"+info.year+"</td>"
   +"</tr>");
   
   */
   
   // Go the next author query
   lastReceivedQuery += 1;
   
   // Update the progress rate and the open access rate
   $("#progress").html(parseInt(1000.0*(lastReceivedQuery+1)/author.length)/10);
   
}

/************************************/
/* code below used to download the CSV file
/* derived from the code by A.H. Bitubekk
/* from https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side
/************************************/

// Download the table containing the results
$("#download").on("click",function(e){

   // CSV file
   var csvContent = '';

   e.preventDefault();
   
   // Building the CSV from the Data two-dimensional array
   // Each column is separated by ";" and new line "\n" for next row
   result.forEach(function(infoArray,index) {
      var dString = "";
      infoArray.forEach(function(str){
         if(str==undefined){
            str="";
         } else {
            str=""+str;
         }
         dString += '"'+str.replace(/"/g,'""')+'";';
      })
      csvContent += index < result.length ? dString + '\n' : dString;
   });
   
   // Build date
   var m = new Date(Date.now()).getMonth()+1;
   if(m<10){
      m="0"+m;
   }
   var d = new Date(Date.now()).getDate();
   if(d<10){
      d="0"+d;
   }
   var date = new Date(Date.now()).getFullYear()+"-"+m+"-"+d+"_"+new Date(Date.now()).getHours()+"h"+new Date(Date.now()).getMinutes();
   
   // Save file
   download(csvContent, 'download-'+date+'.csv', 'text/csv;encoding:utf-8');
})

// The download function takes a CSV string, the filename and mimeType as parameters
// Scroll/look down at the bottom of this snippet to see how download is called
function download(content, fileName, mimeType) {
  var a = document.createElement('a');
  mimeType = mimeType || 'application/octet-stream';

  if (navigator.msSaveBlob) { // IE10
    navigator.msSaveBlob(new Blob([content], {
      type: mimeType
    }), fileName);
  } else if (URL && 'download' in a) { //html5 A[download]
    a.href = URL.createObjectURL(new Blob([content], {
      type: mimeType
    }));
    a.setAttribute('download', fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    location.href = 'data:application/octet-stream,' + encodeURIComponent(content); // only this mime type is supported
  }
/************************************/

}


})