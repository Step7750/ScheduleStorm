/**
 * Created by Ceegan on 8/13/2016.
 */

function MyUniversity(NewUni){
    document.getElementById('MyUniversity').innerHTML = NewUni.innerHTML + " <span class='caret'></span>"
    localStorage.setItem("University", NewUni.innerHTML)
}