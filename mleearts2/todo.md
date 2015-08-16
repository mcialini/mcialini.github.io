TODO
---

index=1;
for i in $(ls -v);
do
    convert $i -resize 900x -quality 70 "photo"$index"-900x.jpg"
    convert $i -resize 500x -quality 70 "photo"$index"-500x.jpg"
    convert $i -resize 300x -quality 70 "photo"$index"-thumb.jpg"
    index=$((index+1));
done

find . -name "*-thumb*" -exec convert "{}" -crop 250x145+0+0 "{}" \;

[Link to cambridge art association](http://cambridgeartassociation.blogspot.com/2015/05/artist-of-week-mary-lee.html)

**Home Page**

- Combine `Mary R. Lee` heading with the background image
    + Should fall inside the outer horns of the cows
    + detach the M, move it up slightly
- Make sure that heading is easily and completely readable when screen shrinks.

**Apps Page**

- ~~Find out what Mary expects~~
- ~~Get assets~~
- ~~Implement Standard View exactly the same~~ 
- ~~Add responsiveness~~

**Animations Page**

- ~~Find out what Mary expects~~
- ~~Get assets~~
- ~~[Vaco the Whale is Worried About the Oceans](https://www.youtube.com/watch?v=J44eODc7y6c)~~
- ~~[Vaco the Whale Cleaning the Ocean for the People](https://www.youtube.com/watch?v=xvvBcdRDa6A)~~
- ~~[Island Dogs](https://www.youtube.com/watch?v=KsxT0l2nSqw)~~
- Show one video at a time with a next button to view next video
- Add responsiveness

**Photography Page**

- ~~Email Mary asking her to finalize on what she wants for the photos.~~
- Create several thumbanils per image based on breakpoint
- Implement standard view as a grid
- Add smooth ability to maximize image by tapping on some button 
- Add responsiveness

**Paintings Page**

- ~~Ask what kind of layout she'd prefer here~~
- Create several thumbanils per image based on breakpoint
- Implement standard view as 3x5 grid
- Add responsiveness

**General Tasks**

- Find out how to remove `.html` from urls
- Maybe use some php to handle repetitive shit