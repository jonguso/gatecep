import { useState } from "react";
import {
View,
Text,
TextInput,
Pressable,
StyleSheet
} from "react-native";

import { router } from "expo-router";

import {
saveProfile
} from "../../src/utils/onboardingStorage";

export default function Name(){

const[first,setFirst]=useState("");
const[last,setLast]=useState("");

async function next(){

await saveProfile({

firstName:first,
lastName:last

});

router.push(
"/new-investor"
);

}

return(

<View style={styles.screen}>

<Text style={styles.title}>
What should Coach G call you?
</Text>

<TextInput
placeholder="First Name"
placeholderTextColor="#94a3b8"
style={styles.input}
value={first}
onChangeText={setFirst}
/>

<TextInput
placeholder="Last Name"
placeholderTextColor="#94a3b8"
style={styles.input}
value={last}
onChangeText={setLast}
/>

<Pressable
style={styles.button}
onPress={next}
>

<Text style={styles.buttonText}>
Continue
</Text>

</Pressable>

</View>

);

}

const styles=StyleSheet.create({

screen:{
flex:1,
backgroundColor:"#020617",
padding:25,
justifyContent:"center"
},

title:{
fontSize:34,
fontWeight:"900",
color:"white",
marginBottom:30
},

input:{
backgroundColor:"#0f172a",
padding:18,
borderRadius:18,
marginBottom:14,
color:"white"
},

button:{
backgroundColor:"#22d3ee",
padding:18,
borderRadius:20
},

buttonText:{
textAlign:"center",
fontWeight:"900"
}

});