/**
 * ui/LoginScreen.kt — Màn hình đăng nhập / đăng ký Firebase (Vitality Style)
 * Tương đương LoginPage.jsx trên Web
 */

package com.example.catagentdeployer.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.airbnb.lottie.compose.*
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    val auth = FirebaseAuth.getInstance()
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    var email       by remember { mutableStateOf("") }
    var password    by remember { mutableStateOf("") }
    var isLoading   by remember { mutableStateOf(false) }
    var errorMsg    by remember { mutableStateOf("") }
    var isSignUp    by remember { mutableStateOf(false) }
    var showPassword by remember { mutableStateOf(false) }
    var showSplash   by remember { mutableStateOf(false) }

    // Lottie Composition for Splash
    val splashComposition by rememberLottieComposition(
        LottieCompositionSpec.Url("https://lottie.host/dc20438e-419a-4665-b6d3-2b80f3fc0467/7HYbyxfZnV.lottie")
    )
    
    // Lottie Composition for Logo
    val logoComposition by rememberLottieComposition(
        LottieCompositionSpec.Url("https://lottie.host/a10d6761-269f-4700-bdbc-6c7693050caf/SilgbdxVrh.lottie")
    )

    fun startApp() {
        showSplash = true
        scope.launch {
            delay(10000) // 10s Splash
            onLoginSuccess()
        }
    }

    fun handleAuth() {
        if (email.isBlank() || password.isBlank()) {
            errorMsg = "Vui lòng nhập email và mật khẩu"
            return
        }
        isLoading = true
        errorMsg = ""
        scope.launch {
            try {
                if (isSignUp) {
                    auth.createUserWithEmailAndPassword(email.trim(), password).await()
                } else {
                    auth.signInWithEmailAndPassword(email.trim(), password).await()
                }
                startApp()
            } catch (e: Exception) {
                errorMsg = e.localizedMessage ?: "Đã có lỗi xảy ra"
            } finally {
                isLoading = false
            }
        }
    }

    if (showSplash) {
        Box(
            modifier = Modifier.fillMaxSize().background(Color.Black),
            contentAlignment = Alignment.Center
        ) {
            LottieAnimation(
                composition = splashComposition,
                iterations = LottieConstants.IterateForever,
                modifier = Modifier.size(400.dp)
            )
        }
        return
    }

    Box(
        modifier = Modifier.fillMaxSize().background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Logo Row
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                LottieAnimation(
                    composition = logoComposition,
                    iterations = LottieConstants.IterateForever,
                    modifier = Modifier.size(80.dp)
                )
                Text(
                    "MAPVIT",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                    letterSpacing = 2.sp
                )
            }

            Text(
                if (isSignUp) "Tạo tài khoản miễn phí" else "Chào mừng trở lại!",
                fontSize = 14.sp,
                color = Color.White.copy(alpha = 0.7f),
                modifier = Modifier.padding(top = 8.dp)
            )

            Spacer(Modifier.height(48.dp))

            // Email field
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; errorMsg = "" },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Email", color = Color.White.copy(alpha = 0.4f)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }),
                singleLine = true,
                shape = RoundedCornerShape(8.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFFEAFF00),
                    unfocusedBorderColor = Color.White.copy(alpha = 0.1f),
                    focusedContainerColor = Color.White.copy(alpha = 0.05f),
                    unfocusedContainerColor = Color.White.copy(alpha = 0.03f),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    cursorColor = Color(0xFFEAFF00)
                )
            )

            Spacer(Modifier.height(16.dp))

            // Password field
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; errorMsg = "" },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Mật khẩu", color = Color.White.copy(alpha = 0.4f)) },
                visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus(); handleAuth() }),
                singleLine = true,
                shape = RoundedCornerShape(8.dp),
                trailingIcon = {
                    IconButton(onClick = { showPassword = !showPassword }) {
                        Icon(if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility, null, tint = Color.White.copy(alpha = 0.4f))
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFFEAFF00),
                    unfocusedBorderColor = Color.White.copy(alpha = 0.1f),
                    focusedContainerColor = Color.White.copy(alpha = 0.05f),
                    unfocusedContainerColor = Color.White.copy(alpha = 0.03f),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    cursorColor = Color(0xFFEAFF00)
                )
            )

            // Error message
            if (errorMsg.isNotEmpty()) {
                Text(
                    errorMsg,
                    color = Color.Red,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 12.dp).fillMaxWidth(),
                    textAlign = TextAlign.Center
                )
            }

            Spacer(Modifier.height(32.dp))

            // Submit button
            Button(
                onClick = { focusManager.clearFocus(); handleAuth() },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                enabled = !isLoading,
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFEAFF00),
                    contentColor = Color.Black,
                    disabledContainerColor = Color(0xFF333333)
                )
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.Black, strokeWidth = 2.dp)
                } else {
                    Text(if (isSignUp) "TẠO TÀI KHOẢN" else "ĐĂNG NHẬP", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                }
            }

            Spacer(Modifier.height(24.dp))

            Text(
                if (isSignUp) "Đã có tài khoản? Đăng nhập" else "Chưa có tài khoản? Đăng ký ngay",
                color = Color.White.copy(alpha = 0.6f),
                fontSize = 14.sp,
                modifier = Modifier.clickable { isSignUp = !isSignUp; errorMsg = "" }
            )
        }
    }
}
