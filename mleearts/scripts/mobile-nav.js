$(document).ready(function(){
    $("body").on("click touchend", "#mobile-nav li.top", function() {
    	// alert("touched");
        $("#inner-menu").toggle(250);
        return false;
    });
});