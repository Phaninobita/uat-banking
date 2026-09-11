package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.BankViewModel
import com.example.ui.MobileTab
import com.example.ui.components.*
import com.example.ui.screens.*
import com.example.ui.theme.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            FirstNationalBankTheme {
                BankApp()
            }
        }
    }
}

@Composable
fun BankApp(
    viewModel: BankViewModel = viewModel()
) {
    val currentTab by viewModel.currentTab.collectAsState()
    val isCustomerLoggedIn by viewModel.isCustomerLoggedIn.collectAsState()
    val currentRmUser by viewModel.currentRmUser.collectAsState()
    val isRmLoggedIn = currentRmUser != null
    val isUserLoggedInToAnyPortal = isCustomerLoggedIn || isRmLoggedIn

    val activeApp by viewModel.activeApplication.collectAsState()
    val simulatedEmails by viewModel.simulatedEmails.collectAsState()
    val toastNotification by viewModel.toastNotification.collectAsState()
    val isVoiceControlEnabled by viewModel.isVoiceControlEnabled.collectAsState()

    val context = androidx.compose.ui.platform.LocalContext.current
    val voiceManager = remember { com.example.voice.VoiceAssistantManager(context.applicationContext, viewModel) }
    DisposableEffect(voiceManager) {
        onDispose {
            voiceManager.destroy()
        }
    }

    val isTransferSheetOpen by viewModel.isTransferSheetOpen.collectAsState()
    val transferSuccessTx by viewModel.isTransferSuccessDialog.collectAsState()
    val submissionSuccessRef by viewModel.submissionSuccessRef.collectAsState()
    val selectedDocForPreview by viewModel.selectedDocForPreview.collectAsState()

    Scaffold(
        modifier = Modifier
            .fillMaxSize(),
        topBar = {
            TopHeader(
                currentTab = currentTab,
                isCustomerLoggedIn = isCustomerLoggedIn,
                isRmLoggedIn = isRmLoggedIn,
                isVoiceControlEnabled = isVoiceControlEnabled,
                activeApp = activeApp,
                onToggleVoiceControl = {
                    viewModel.toggleVoiceControl(!isVoiceControlEnabled)
                },
                onSyncDatabase = {
                    viewModel.syncWithSupabase()
                },
                onToggleRework = { viewModel.toggleReworkMode() },
                onSignOut = {
                    if (currentTab == MobileTab.RM_SUITE || isRmLoggedIn) {
                        viewModel.signOutRm()
                    } else {
                        viewModel.signOutCustomer()
                    }
                }
            )
        },
        bottomBar = {
            if (!isUserLoggedInToAnyPortal) {
                BottomNavBar(
                    selectedTab = currentTab,
                    unreadCount = simulatedEmails.size,
                    onTabSelected = { tab ->
                        viewModel.selectTab(tab)
                    }
                )
            }
        },
        contentWindowInsets = WindowInsets.navigationBars
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(FnbDarkBg)
        ) {
            // Main Tab View Content with smooth Crossfade
            Crossfade(targetState = currentTab, label = "TabSwitch") { tab ->
                when (tab) {
                    MobileTab.BANKING -> LiveBankingScreen(viewModel = viewModel)
                    MobileTab.ONBOARDING -> OnboardingScreen(viewModel = viewModel, voiceManager = voiceManager)
                    MobileTab.RM_SUITE -> RmExecutiveScreen(viewModel = viewModel)
                    MobileTab.INBOX -> InboxScreen(viewModel = viewModel)
                }
            }

            // Floating Toast Notification
            AnimatedVisibility(
                visible = toastNotification != null,
                enter = fadeIn() + slideInVertically(initialOffsetY = { -it }),
                exit = fadeOut() + slideOutVertically(targetOffsetY = { -it }),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(16.dp)
            ) {
                toastNotification?.let { toast ->
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (toast.isError) FnbErrorBg else Color(0xFF132A1C),
                        border = BorderStroke(1.dp, if (toast.isError) FnbError else FnbSuccess),
                        tonalElevation = 8.dp
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = if (toast.isError) Icons.Default.Warning else Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = if (toast.isError) FnbError else FnbSuccess,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = toast.message,
                                color = FnbTextPrimary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }

            // Wire Transfer Modal Sheet
            if (isTransferSheetOpen) {
                WireTransferDialog(viewModel = viewModel)
            }

            // Wire Transfer Settled Dialog
            transferSuccessTx?.let { tx ->
                TransferSuccessDialog(tx = tx) {
                    viewModel.isTransferSuccessDialog.value = null
                }
            }

            // Application Submitted Dialog
            submissionSuccessRef?.let { ref ->
                SubmissionSuccessDialog(
                    refCode = ref,
                    onOpenBanking = {
                        viewModel.submissionSuccessRef.value = null
                        viewModel.selectTab(MobileTab.BANKING)
                    },
                    onDismiss = {
                        viewModel.submissionSuccessRef.value = null
                    }
                )
            }

            // Document Base64 Vault Preview Dialog
            selectedDocForPreview?.let { doc ->
                DocumentPreviewDialog(
                    doc = doc,
                    onDismiss = { viewModel.closeDocPreview() }
                )
            }
        }
    }
}
