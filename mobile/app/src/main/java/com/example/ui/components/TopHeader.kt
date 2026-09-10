package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.OnboardingApplication
import com.example.ui.MobileTab
import com.example.ui.theme.*

@Composable
fun TopHeader(
    currentTab: MobileTab,
    isCustomerLoggedIn: Boolean,
    isRmLoggedIn: Boolean = false,
    isVoiceControlEnabled: Boolean = false,
    activeApp: OnboardingApplication,
    onToggleVoiceControl: () -> Unit = {},
    onSyncDatabase: () -> Unit = {},
    onToggleRework: () -> Unit,
    onSignOut: () -> Unit
) {
    Surface(
        color = FnbSurface,
        border = BorderStroke(1.dp, FnbBorder),
        tonalElevation = 4.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Left: Logo & Context Title
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(
                            if (currentTab == MobileTab.RM_SUITE) FnbGoldBg else FnbPrimaryBg
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (currentTab == MobileTab.RM_SUITE) Icons.Default.BusinessCenter else Icons.Default.AccountBalance,
                        contentDescription = null,
                        tint = if (currentTab == MobileTab.RM_SUITE) FnbGold else FnbPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "First Bank Demo",
                            color = FnbTextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Color(0x2610B981),
                            border = BorderStroke(1.dp, Color(0x4D10B981)),
                            modifier = Modifier.clickable { onSyncDatabase() }
                        ) {
                            Text(
                                text = "⚡ Supabase",
                                color = FnbSuccess,
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                    Text(
                        text = when (currentTab) {
                            MobileTab.BANKING -> "Treasury & Core Banking"
                            MobileTab.ONBOARDING -> if (isCustomerLoggedIn) "Onboarding · Step ${activeApp.currentStep} of 7" else "Corporate Portal Access"
                            MobileTab.RM_SUITE -> "RM Executive Command"
                            MobileTab.INBOX -> "Corporate Communications"
                        },
                        color = if (currentTab == MobileTab.RM_SUITE) FnbGold else FnbPrimary,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // Right: Actions
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // Rework Mode Toggle Chip (Only in Onboarding tab AND only when logged in)
                if (currentTab == MobileTab.ONBOARDING && isCustomerLoggedIn) {
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = if (activeApp.isReworkMode) FnbErrorBg else FnbCard,
                        border = BorderStroke(1.dp, if (activeApp.isReworkMode) FnbError else FnbBorder),
                        modifier = Modifier.clickable { onToggleRework() }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = if (activeApp.isReworkMode) Icons.Default.Warning else Icons.Default.EditNote,
                                contentDescription = null,
                                tint = if (activeApp.isReworkMode) FnbError else FnbTextSecondary,
                                modifier = Modifier.size(12.dp)
                            )
                            Text(
                                text = if (activeApp.isReworkMode) "Rework ON" else "Simulate Rework",
                                color = if (activeApp.isReworkMode) FnbError else FnbTextSecondary,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                // Voice Control Action Button
                IconButton(
                    onClick = onToggleVoiceControl,
                    modifier = Modifier.size(32.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(if (isVoiceControlEnabled) FnbPrimary else Color.Transparent),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isVoiceControlEnabled) Icons.Default.Mic else Icons.Default.MicNone,
                            contentDescription = "Voice Control",
                            tint = if (isVoiceControlEnabled) FnbDarkBg else FnbTextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                // Sign Out / Exit Portal (Only show when logged in)
                if (isCustomerLoggedIn || isRmLoggedIn) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = FnbCard,
                        border = BorderStroke(1.dp, FnbBorder),
                        modifier = Modifier.clickable { onSignOut() }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ExitToApp,
                                contentDescription = "Exit / Sign Out",
                                tint = FnbTextSecondary,
                                modifier = Modifier.size(15.dp)
                            )
                            Text(
                                text = "Exit",
                                color = FnbTextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }
}
