$(document).ready(function(){
    var moving = false;

    $(document).bind('touchmove', function(e) {
        moving = true;
    });

    $(document).bind('touchstart', function(e) {
        moving = false;
    });

    // Blow up the clicked on image and hide the others.
    $("body").on("click touchend", ".grid .img .helper", function() {
        if (moving !== true) {
            if (!window.matchMedia('(max-device-width: 479px)').matches) {
                var img = $(this).parent().find("img");
                var newsrc = $(img).attr("src").replace('thumb', '900x');
                $(img).attr("src", newsrc);
                $(this).parent().addClass("selected");
                $(this).parent().siblings().addClass("hidden");
                $(this).css({'opacity': 1});
            }
        }
        return false;
    });

    // Shrink the selected image back down and show the others.
    $("body").on("click touchend", ".grid .img.selected .helper", function() {
        if (moving !== true) {
            var parent = $(this).parent();
            $(parent).siblings().removeClass("hidden");
            $(parent).removeClass("selected");
            var img = $(parent).find("img");
            var thumb = $(img).attr("src").replace("900x", "thumb");
            $(img).attr("src", thumb);
            $(parent).removeClass("selected");
            $(this).css({'opacity': 0});
        }
        return false;
    });
});