/**
 * ui/LoginScreen.kt — Màn hình đăng nhập / đăng ký Firebase
 * Tương đương LoginPage.jsx trên Web
 */

package com.example.catagentdeployer.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.auth.FirebaseAuth
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

    fun handleAuth() {
        if (email.isBlank() || password.isBlank()) {
            errorMsg = "Vui lòng nhập email và mật khẩu"
            return
        }
        if (password.length < 6) {
            errorMsg = "Mật khẩu phải có ít nhất 6 ký tự"
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
                onLoginSuccess()
            } catch (e: Exception) {
                errorMsg = when {
                    e.message?.contains("no user record") == true -> "Tài khoản không tồn tại"
                    e.message?.contains("password is invalid") == true -> "Mật khẩu không đúng"
                    e.message?.contains("email address is already") == true -> "Email đã được đăng ký"
                    e.message?.contains("badly formatted") == true -> "Email không hợp lệ"
                    else -> e.message ?: "Đã có lỗi xảy ra"
                }
            } finally {
                isLoading = false
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF0F172A), Color(0xFF1E3A5F))
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            elevation = CardDefaults.cardElevation(defaultElevation = 16.dp)
        ) {
            Column(
                modifier = Modifier.padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Logo
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .background(
                            Brush.linearGradient(listOf(Color(0xFF4285F4), Color(0xFF34A853))),
                            shape = RoundedCornerShape(20.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Map, null, tint = Color.White, modifier = Modifier.size(40.dp))
                }

                Spacer(Modifier.height(20.dp))

                Text(
                    "GGMap",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    "Bản đồ thông minh",
                    fontSize = 14.sp,
                    color = Color(0xFF94A3B8),
                    modifier = Modifier.padding(top = 4.dp)
                )

                Spacer(Modifier.height(32.dp))

                // Tab: Đăng nhập / Đăng ký
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF0F172A), RoundedCornerShape(12.dp))
                        .padding(4.dp)
                ) {
                    listOf(false to "Đăng nhập", true to "Đăng ký").forEach { (signUp, label) ->
                        Button(
                            onClick = { isSignUp = signUp; errorMsg = "" },
                            modifier = Modifier.weight(1f).height(40.dp),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isSignUp == signUp) Color(0xFF4285F4) else Color.Transparent,
                                contentColor = Color.White
                            ),
                            elevation = ButtonDefaults.buttonElevation(0.dp)
                        ) {
                            Text(label, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                        }
                    }
                }

                Spacer(Modifier.height(24.dp))

                // Email field
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it; errorMsg = "" },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Email") },
                    leadingIcon = { Icon(Icons.Default.Email, null) },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    ),
                    keyboardActions = KeyboardActions(
                        onNext = { focusManager.moveFocus(FocusDirection.Down) }
                    ),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF4285F4),
                        unfocusedBorderColor = Color(0xFF334155),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedLabelColor = Color(0xFF4285F4),
                        unfocusedLabelColor = Color(0xFF94A3B8),
                        focusedLeadingIconColor = Color(0xFF4285F4),
                        unfocusedLeadingIconColor = Color(0xFF94A3B8),
                        cursorColor = Color(0xFF4285F4),
                    )
                )

                Spacer(Modifier.height(16.dp))

                // Password field
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it; errorMsg = "" },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Mật khẩu") },
                    leadingIcon = { Icon(Icons.Default.Lock, null) },
                    trailingIcon = {
                        IconButton(onClick = { showPassword = !showPassword }) {
                            Icon(
                                if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                null,
                                tint = Color(0xFF94A3B8)
                            )
                        }
                    },
                    visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus(); handleAuth() }),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF4285F4),
                        unfocusedBorderColor = Color(0xFF334155),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedLabelColor = Color(0xFF4285F4),
                        unfocusedLabelColor = Color(0xFF94A3B8),
                        focusedLeadingIconColor = Color(0xFF4285F4),
                        unfocusedLeadingIconColor = Color(0xFF94A3B8),
                        cursorColor = Color(0xFF4285F4),
                    )
                )

                // Error message
                AnimatedVisibility(visible = errorMsg.isNotEmpty()) {
                    Text(
                        errorMsg,
                        color = Color(0xFFEF4444),
                        fontSize = 13.sp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        textAlign = TextAlign.Start
                    )
                }

                Spacer(Modifier.height(24.dp))

                // Submit button
                Button(
                    onClick = { focusManager.clearFocus(); handleAuth() },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    enabled = !isLoading,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF4285F4),
                        disabledContainerColor = Color(0xFF334155)
                    )
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            if (isSignUp) "Tạo tài khoản" else "Đăng nhập",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }
                }
            }
        }
    }
}
