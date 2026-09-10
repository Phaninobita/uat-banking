package com.example.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.SimulatedEmail
import com.example.ui.BankViewModel
import com.example.ui.MobileTab
import com.example.ui.theme.*

@Composable
fun InboxScreen(viewModel: BankViewModel) {
    val emails by viewModel.simulatedEmails.collectAsState()
    val context = LocalContext.current
    var searchQuery by remember { mutableStateOf("") }

    val filteredEmails = emails.filter {
        searchQuery.isBlank() ||
                it.subject.contains(searchQuery, ignoreCase = true) ||
                it.text.contains(searchQuery, ignoreCase = true) ||
                it.from.contains(searchQuery, ignoreCase = true)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FnbDarkBg)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Search bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search corporate messages...", fontSize = 12.sp) },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = null,
                    tint = FnbTextSecondary,
                    modifier = Modifier.size(18.dp)
                )
            },
            trailingIcon = {
                if (searchQuery.isNotBlank()) {
                    IconButton(onClick = { searchQuery = "" }) {
                        Icon(Icons.Default.Close, contentDescription = "Clear", tint = FnbTextSecondary, modifier = Modifier.size(16.dp))
                    }
                }
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = FnbTextPrimary,
                unfocusedTextColor = FnbTextPrimary,
                focusedBorderColor = FnbPrimary,
                unfocusedBorderColor = FnbBorder,
                focusedContainerColor = FnbSurface,
                unfocusedContainerColor = FnbSurface
            )
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Simulated Messages (${filteredEmails.size})",
                color = FnbTextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp
            )
            Text(
                text = "Auto-recorded in real time",
                color = FnbTextMuted,
                fontSize = 11.sp
            )
        }

        if (filteredEmails.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.MailOutline,
                        contentDescription = null,
                        tint = FnbTextMuted,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(text = "No messages found.", color = FnbTextSecondary, fontSize = 13.sp)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(filteredEmails) { mail ->
                    EmailCard(
                        mail = mail,
                        onCopyCode = { code ->
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            clipboard.setPrimaryClip(ClipData.newPlainText("OTP", code))
                            viewModel.showToast("Copied code $code")
                        },
                        onOpenOnboarding = {
                            viewModel.selectTab(MobileTab.ONBOARDING)
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun EmailCard(
    mail: SimulatedEmail,
    onCopyCode: (String) -> Unit,
    onOpenOnboarding: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = FnbSurface),
        border = BorderStroke(1.dp, FnbBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(FnbPrimaryBg),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Email,
                            contentDescription = null,
                            tint = FnbPrimary,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                    Text(
                        text = mail.from,
                        color = FnbPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }
                Text(
                    text = mail.timestamp,
                    color = FnbTextMuted,
                    fontSize = 10.sp
                )
            }

            Text(
                text = mail.subject,
                color = FnbTextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp
            )

            Text(
                text = mail.text,
                color = FnbTextSecondary,
                fontSize = 11.sp,
                lineHeight = 16.sp
            )

            if (mail.code != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = FnbPrimaryBg,
                        border = BorderStroke(1.dp, FnbPrimary)
                    ) {
                        Text(
                            text = "Code: ${mail.code}",
                            color = FnbPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }

                    Button(
                        onClick = { onCopyCode(mail.code) },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = FnbCard,
                            contentColor = FnbPrimary
                        ),
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(12.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "Copy Code", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            if (mail.subject.contains("Invitation", ignoreCase = true)) {
                Button(
                    onClick = onOpenOnboarding,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = FnbGoldBg,
                        contentColor = FnbGold
                    ),
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(text = "Open Onboarding Registration →", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
