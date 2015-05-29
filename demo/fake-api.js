import Rx from 'rx';

/* Dummy image search */

const fallbackImages = [
  '0055c8cffee3be87f769fe6f7d201febb561bd00.jpg',
  '00abd4bb51e169b2b4b009d9039d8ba0ab4a7016.jpg',
  '04c419edfcf9efc245c9e61daca252c247c6ffd6.jpg',
  '0687e6478ba043135d845994ad50ebc0d4e456a3.jpg',
  '09082fa2a15419284362d89aa96666c2a0f43457.jpg',
  '0988d3be23ea0667b2b5488f029e18315ffff878.jpg',
  '0aa43865165a87a12125e6802bc770d2e37a1df9.jpg',
  '0aa82e11b3773a7ee88c623ab3806736e6b3149c.jpg',
  '0df3e3d29d8d661d9b9f41fac485a405fc7efefb.jpg',
  '0f93fbe2cc3bdce94cee44c798b1c81f02aa3b2b.jpg',
  '1634cfb66e1d4dcfa1805b953f8edc86bb71413f.jpg',
  '1c37d7071cd0140d74e17322ffd3cde708654e71.jpg',
  '1f289e1e9aea944d96778144684756070da8bac4.jpg'
].map(src => `/fallback/images/${src}`);


export function searchImages({query, free}) {
  return Rx.Observable.return({
    data: fallbackImages.
      filter(imageSrc => {
        if (free) return imageSrc.match('8');
        else      return imageSrc;
      }).
      filter(imageSrc => imageSrc.match(query)).
      map(imageSrc => ({
        data: {
          thumbnail: {
            secureUrl: imageSrc
          }
        }
      }))
  });
};
