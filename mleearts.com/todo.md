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

**General Tasks**

- Find out how to remove `.html` from urls
- Maybe use some php to handle repetitive shit