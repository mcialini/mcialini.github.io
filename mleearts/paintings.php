<html>
<head>
	<link href="style.css" rel="stylesheet" type="text/css">
    <!-- <link href="style2.css" rel="stylesheet" type="text/css"> -->
    <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
    <script src="scripts/jquery.ui.touch-punch.min.js"></script>
    <script> 
        $(document).ready(function(){
            $("body").on("click","#gallery .img .helper", function() {
                var source = $(this).parent().find("img");
                swapPicture($(source));
            });

            $("body").on("click",  "#main-image .arrow.prev", function() {
                    var thumbs = $("#gallery img").toArray();
                    var newimg = $("#main-image img");
                    var i;
                    for (i = 0; i < $(thumbs).length; i++) {
                            if ($(thumbs).eq(i).hasClass("selected")) {
                                    var newindex = (i - 1) % $(thumbs).length;
                                    newimg = $(thumbs).eq(newindex);
                                    swapPicture(newimg);
                                    break;
                            }
                    }
            });

            $("body").on("click",  "#main-image .arrow.next", function() {
                    var thumbs = $("#gallery img").toArray();
                    var newimg = $("#main-image img");
                    var i;
                    for (i = 0; i < $(thumbs).length; i++) {
                            if ($(thumbs).eq(i).hasClass("selected")) {
                                    var newindex = (i + 1) % $(thumbs).length;
                                    newimg = $(thumbs).eq(newindex);
                                    swapPicture(newimg);
                                    break;
                            }
                    }
            });

            function swapPicture(newpic) {
                /* UPDATE CURRENTLY SELECTED PICTURE */
                var newsrc = $(newpic).attr("src").replace('_thumb', '');
                if (!$(newpic).hasClass("selected")) {
                        $("#gallery img.selected").removeClass("selected");
                        $(newpic).addClass("selected");

                        /* MODIFY ATTRIBUTES OF MAIN IMAGE */
                        var main = $("#main-image img");
                        $(main).attr("data-content",$(newpic).attr("data-content"));
                        $(main).attr("src",newsrc);
                        $(main).attr("alt",$(newpic).attr("alt"));
                }

            }
        });
    </script>
</head>
<body>
    <div id="container"> <!-- Wraps the whole screen -->
        <div id="wrapper"> <!-- Wraps the screen after left/right margins -->
            <div id="main"> <!-- Wraps top half content -->
                <a href="paintings2.html" style="display: block;text-align: center;color:white;font-weight:bold;">GO TO LIGHT BACKGROUND</a>
                <div id="main-image">
                    <div class="arrow-container">
                        <a class="arrow prev"></a>
                    </div>
                    <div class="arrow-container">
                        <a class="arrow next"></a>
                    </div>
                    <img src="gallery/paintings/DSC_0003.JPG">
                </div>
                <!-- <span class="caption">The White Tiger - 2008</span> -->
                <div id="gallery">
                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>                        
                        <img class="selected" src="gallery/paintings/DSC_0003_thumb.JPG">
                    </div>
                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_650_thumb.JPG">
                    </div>
                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_3015_thumb.JPG">
                    </div>
                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_7466_thumb.JPG">
                    </div>
                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_7503_thumb.JPG">
                    </div>

                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_0018_thumb.JPG">
                    </div>
                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_0024_thumb.JPG">
                    </div>
                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_0108_thumb.JPG">
                    </div>
                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_0145_thumb.JPG">
                    </div>
                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_0279_thumb.JPG">
                    </div>
                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_0356_thumb.JPG">
                    </div>
                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_3352_thumb.JPG">
                    </div>
                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_3366_thumb.JPG">
                    </div>

                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_3870_thumb.JPG">
                    </div>

                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_3936_thumb.JPG">
                    </div>

                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/DSC_4082_thumb.JPG">
                    </div>

                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/Image_2_thumb.JPG">
                    </div>

                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/Image_6_thumb.JPG">
                    </div>

                    <div class="img" data-content="The White Tiger - 2008">
                        <span class="helper"></span>
                        <img src="gallery/paintings/newhampshire_journey.JPG">
                    </div>

                </div>
            </div>
        </div>
        <nav>
            <ul>
                <li>
                    <a href="index.html">Home</a>
                </li>
                <li>
                    <a href="apps.html">Apps</a>
                </li>
                <li>
                    <a href="animation.html">Island Dogs</a>
                </li>
                <li>
                    <a href="paintings.html">Paintings and Drawings</a>
                </li>
                <li>
                    <a href="photos.html">Calendar Photography</a>
                </li>
                <li>
                    <a href="contact.html">Contact</a>
                </li>
            </ul>
        </nav>
    </div>
</body>
</html>