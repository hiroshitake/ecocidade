import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  getSupabaseSessionUser,
  isSupabaseConfigured,
  signInWithSupabase,
  signOutFromSupabase,
  signUpWithSupabase,
  supabase,
  updateSupabaseProfile,
  uploadSupabaseAvatar,
  createSupabaseAvatarUrl,
  deleteSupabaseAccount,
} from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const AUTH_TOKEN_KEY = "ecocidade.token";
const AUTH_USER_KEY = "ecocidade.user";

interface AuthUser { id:string; email:string; name:string; role:string; city?:string; birthdate?:string; avatar_path?:string | null; }
interface AuthResponse { id:string; email:string; name:string; role:string; token:string; }
function getBaseUrl(){ return API_URL; }
async function request<T>(path:string, init:RequestInit={}, auth=true):Promise<T>{
 const headers:Record<string,string>={"Content-Type":"application/json",...(init.headers as Record<string,string>|undefined)};
 if(auth){const token=await AsyncStorage.getItem(AUTH_TOKEN_KEY);if(token)headers.Authorization=`Bearer ${token}`;}
 const response=await fetch(`${getBaseUrl()}${path}`,{...init,headers});
 const contentType=response.headers.get("content-type")||""; const body=contentType.includes("application/json")?await response.json():await response.text();
 if(!response.ok){const message=typeof body==="string"?body:body?.error||"Falha na requisição";throw new Error(message);} return body as T;
}
export async function signUp(email:string,password:string,name:string,city?:string){
 if(isSupabaseConfigured()){const data=await signUpWithSupabase(email,password,name,city);const user=data.user;if(user)await AsyncStorage.setItem(AUTH_USER_KEY,JSON.stringify({id:user.id,email:user.email,name,role:"user",city}));return {id:user?.id||"",email,name,role:"user",city,token:""} as AuthResponse;} throw new Error("Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}
export async function signIn(email:string,password:string){
 if(isSupabaseConfigured()){await signInWithSupabase(email,password);const user=await getSupabaseSessionUser();if(user)await AsyncStorage.setItem(AUTH_USER_KEY,JSON.stringify(user));return {id:user?.id||"",email,name:user?.name||email,role:user?.role||"user",token:""} as AuthResponse;} throw new Error("Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}
export async function signInAdmin(email:string,password:string){
 if(isSupabaseConfigured()){await signInWithSupabase(email,password);const user=await getSupabaseSessionUser();if(user)await AsyncStorage.setItem(AUTH_USER_KEY,JSON.stringify(user));return {id:user?.id||"",email:user?.email||email,name:user?.name||email,role:user?.role||"admin",token:""} as AuthResponse;} throw new Error("Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}
export async function logout(){await AsyncStorage.removeItem(AUTH_TOKEN_KEY);await AsyncStorage.removeItem(AUTH_USER_KEY);if(isSupabaseConfigured())await signOutFromSupabase();}
export async function getCurrentUserData():Promise<AuthUser|null>{
 if(isSupabaseConfigured()){const user=await getSupabaseSessionUser();if(user){await AsyncStorage.setItem(AUTH_USER_KEY,JSON.stringify(user));return user;}}
 const storedUser=await AsyncStorage.getItem(AUTH_USER_KEY);if(!storedUser)return null;try{return JSON.parse(storedUser) as AuthUser;}catch{return null;}
}
export async function updateUserProfile(userId:string,updates:Partial<AuthUser>){
 if(isSupabaseConfigured()){const allowedUpdates:Record<string, unknown>={};if(typeof updates.name==="string")allowedUpdates.name=updates.name;if("avatar_path" in updates)allowedUpdates.avatar_path=updates.avatar_path ?? null;const data=await updateSupabaseProfile(userId,allowedUpdates);const currentUser=await getCurrentUserData();if(currentUser?.id===userId)await AsyncStorage.setItem(AUTH_USER_KEY,JSON.stringify({...currentUser,...data}));return data;} throw new Error("Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}
export async function uploadUserAvatar(imageUri:string,userId:string){
 if(!isSupabaseConfigured())throw new Error("Supabase não configurado.");
 return uploadSupabaseAvatar(imageUri,userId);
}
export async function getCurrentUserAvatarUrl(path?:string|null){
 if(!isSupabaseConfigured())return null;
 const user=await getCurrentUserData();
 const avatarPath=path ?? user?.avatar_path;
 if(!avatarPath)return null;
 try{return await createSupabaseAvatarUrl(avatarPath);}catch{return null;}
}
export async function changeUserPassword(currentPassword:string,newPassword:string){
 if(!supabase)throw new Error("Supabase não configurado.");
 const {data:{user}}=await supabase.auth.getUser();
 if(!user?.email)throw new Error("Sessão inválida. Faça login novamente.");
 const {error:reauthError}=await supabase.auth.signInWithPassword({email:user.email,password:currentPassword});
 if(reauthError)throw new Error("A senha atual está incorreta.");
 const {error}=await supabase.auth.updateUser({password:newPassword});
 if(error)throw error;
}
export async function deleteUserAccount(){
 if(!supabase)throw new Error("Supabase não configurado.");
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)throw new Error("Sessão inválida. Faça login novamente.");
 const {data,error}=await deleteSupabaseAccount();
 if(error)throw error;
 await AsyncStorage.removeItem(AUTH_TOKEN_KEY);await AsyncStorage.removeItem(AUTH_USER_KEY);await supabase.auth.signOut();
 return data;
}
export async function getUserCityCenterFallback():Promise<{latitude:number;longitude:number}|null>{
 const user=await getCurrentUserData();const cityName=user?.city?.trim();if(!cityName||!supabase)return null;
 try{const {data,error}=await supabase.from("cities").select("latitude, longitude").ilike("name",cityName).maybeSingle();if(error)return null;const latitude=Number(data?.latitude),longitude=Number(data?.longitude);if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return null;return {latitude,longitude};}catch{return null;}
}

export async function resolveUserLocationWithFallback():Promise<{location:{latitude:number;longitude:number}|null;source:"gps"|"city"|"none";reason:"gps"|"gps_unavailable"|"permission_denied"|"city_fallback"}> {
 const fallbackPromise=getUserCityCenterFallback();
 const isLocalhostWeb=Platform.OS==="web"&&typeof window!=="undefined"&&/localhost|127\.0\.0\.1/.test(window.location.hostname);
 if(isLocalhostWeb){const fallback=await fallbackPromise;return {location:fallback,source:fallback?"city":"none",reason:fallback?"city_fallback":"gps_unavailable"};}
 if(Platform.OS==="web"&&typeof navigator!=="undefined"&&navigator.geolocation){
  return await new Promise(resolve=>{
   let settled=false;
   const finish=(result:any)=>{if(settled)return;settled=true;clearTimeout(timer);resolve(result);};
   const timer=setTimeout(async()=>{const fallback=await fallbackPromise;finish({location:fallback,source:fallback?"city":"none",reason:fallback?"city_fallback":"gps_unavailable"});},10000);
   navigator.geolocation.getCurrentPosition(position=>finish({location:{latitude:position.coords.latitude,longitude:position.coords.longitude},source:"gps",reason:"gps"}),async error=>{const fallback=await fallbackPromise;finish({location:fallback,source:fallback?"city":"none",reason:error?.code===1?"permission_denied":fallback?"city_fallback":"gps_unavailable"});},{enableHighAccuracy:true,timeout:10000,maximumAge:0});
  });
 }
 try{
  const location=await import("expo-location");const {status}=await location.default.requestForegroundPermissionsAsync();if(status!=="granted"){const fallback=await fallbackPromise;return {location:fallback,source:fallback?"city":"none",reason:"permission_denied"};}
  const loc=await location.default.getCurrentPositionAsync({accuracy:location.default.Accuracy.High});return {location:{latitude:loc.coords.latitude,longitude:loc.coords.longitude},source:"gps",reason:"gps"};
 }catch{const fallback=await fallbackPromise;return {location:fallback,source:fallback?"city":"none",reason:fallback?"city_fallback":"gps_unavailable"};}
}

export async function resolveUserLocationForSubmission(){const result=await resolveUserLocationWithFallback();if(result.source!=="gps")return {...result,location:null,source:"none" as const};return result;}
