package com.example.ui.screens

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.*
import com.example.ui.BankViewModel
import com.example.ui.theme.*

data class OnboardingStepItem(
    val number: Int,
    val title: String,
    val shortName: String,
    val description: String,
    val icon: ImageVector
)

val onboardingStepsList = listOf(
    OnboardingStepItem(
        number = 1,
        title = "Documents & Verification",
        shortName = "Documents",
        description = "Trade license, certificates & OCR verification",
        icon = Icons.Default.Description
    ),
    OnboardingStepItem(
        number = 2,
        title = "Company Information",
        shortName = "Company Info",
        description = "CRN, trade name, tax registration & contacts",
        icon = Icons.Default.Business
    ),
    OnboardingStepItem(
        number = 3,
        title = "Ultimate Beneficial Owners (UBO)",
        shortName = "UBOs",
        description = "Owners holding ≥ 25% equity or voting power",
        icon = Icons.Default.People
    ),
    OnboardingStepItem(
        number = 4,
        title = "Ownership Structure & Cap Table",
        shortName = "Ownership",
        description = "Cap table shareholders, tiers & rework resolution",
        icon = Icons.Default.PieChart
    ),
    OnboardingStepItem(
        number = 5,
        title = "Corporate Governance & Roles",
        shortName = "Governance",
        description = "Authorized signatories, board powers & signatures",
        icon = Icons.Default.Gavel
    ),
    OnboardingStepItem(
        number = 6,
        title = "FATCA & CRS Compliance",
        shortName = "FATCA/CRS",
        description = "US tax status, GIIN & regulatory certifications",
        icon = Icons.Default.Security
    ),
    OnboardingStepItem(
        number = 7,
        title = "Review & Final Submission",
        shortName = "Review & Submit",
        description = "Consolidated compliance audit & application submission",
        icon = Icons.Default.FactCheck
    )
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnboardingScreen(
    viewModel: BankViewModel,
    voiceManager: com.example.voice.VoiceAssistantManager? = null
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val effectiveVoiceManager = voiceManager ?: remember { com.example.voice.VoiceAssistantManager(context.applicationContext, viewModel) }
    val isVoiceControlEnabled by viewModel.isVoiceControlEnabled.collectAsState()

    val isCustomerLoggedIn by viewModel.isCustomerLoggedIn.collectAsState()
    if (!isCustomerLoggedIn) {
        CustomerLoginScreen(viewModel = viewModel, voiceManager = effectiveVoiceManager)
        return
    }

    val activeApp by viewModel.activeApplication.collectAsState()
    val scrollState = rememberScrollState()
    var showStepsSheet by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FnbDarkBg)
    ) {
        // Floating/Docked Voice Control Banner if Active
        if (isVoiceControlEnabled) {
            com.example.ui.components.VoiceControlOverlay(
                viewModel = viewModel,
                voiceManager = effectiveVoiceManager
            )
        }

        // Rework Banner if Active
        if (activeApp.isReworkMode) {
            Surface(
                color = FnbErrorBg,
                border = BorderStroke(1.dp, FnbError),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        tint = FnbError,
                        modifier = Modifier.size(20.dp)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Rework Required: Compliance Flagged Step 4 (Ownership Structure)",
                            color = FnbTextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                        Text(
                            text = activeApp.reworkComment,
                            color = FnbTextSecondary,
                            fontSize = 11.sp
                        )
                    }
                    Button(
                        onClick = { viewModel.goToStep(4) },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = FnbError,
                            contentColor = Color.White
                        ),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(text = "Go to Step 4", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Stepper Navigation Header with Top-Left Toggle Button
        Surface(
            color = FnbSurface,
            modifier = Modifier
                .fillMaxWidth()
                .border(width = 1.dp, color = FnbBorder)
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Top-Left Toggle Button to show all steps
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = FnbPrimaryBg,
                        border = BorderStroke(1.dp, FnbPrimary),
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { showStepsSheet = true }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.FormatListNumbered,
                                contentDescription = "Toggle Steps",
                                tint = FnbPrimary,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "Steps (${activeApp.currentStep}/7)",
                                color = FnbPrimary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Icon(
                                imageVector = Icons.Default.KeyboardArrowDown,
                                contentDescription = null,
                                tint = FnbPrimary,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    // Active Step Label & Progress Percentage
                    val currentStepMeta = onboardingStepsList.getOrNull(activeApp.currentStep - 1)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = currentStepMeta?.shortName ?: "Step ${activeApp.currentStep}",
                                color = FnbTextPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Step ${activeApp.currentStep} of 7 · ${((activeApp.currentStep / 7.0f) * 100).toInt()}%",
                                color = FnbTextSecondary,
                                fontSize = 11.sp
                            )
                        }
                    }
                }

                // Progress line
                LinearProgressIndicator(
                    progress = { activeApp.currentStep / 7.0f },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp),
                    color = FnbPrimary,
                    trackColor = FnbCard
                )
            }
        }

        // All Steps Modal Bottom Sheet
        if (showStepsSheet) {
            ModalBottomSheet(
                onDismissRequest = { showStepsSheet = false },
                containerColor = FnbSurface,
                scrimColor = Color.Black.copy(alpha = 0.65f),
                dragHandle = { BottomSheetDefaults.DragHandle(color = FnbBorder) }
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .padding(bottom = 32.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
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
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(FnbPrimaryBg),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Layers,
                                    contentDescription = null,
                                    tint = FnbPrimary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Column {
                                Text(
                                    text = "Onboarding Steps",
                                    color = FnbTextPrimary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                                Text(
                                    text = "Tap any step below to jump directly",
                                    color = FnbTextSecondary,
                                    fontSize = 11.sp
                                )
                            }
                        }
                        IconButton(onClick = { showStepsSheet = false }) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                tint = FnbTextSecondary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    HorizontalDivider(color = FnbBorder, thickness = 1.dp)

                    LazyColumn(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(onboardingStepsList) { step ->
                            val isSelected = activeApp.currentStep == step.number
                            val isCompleted = activeApp.currentStep > step.number
                            val isReworkStep = step.number == 4 && activeApp.isReworkMode

                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = when {
                                    isReworkStep -> Color(0xFF2E151A)
                                    isSelected -> FnbPrimaryBg
                                    isCompleted -> Color(0xFF132035)
                                    else -> FnbCard
                                },
                                border = BorderStroke(
                                    1.dp,
                                    when {
                                        isReworkStep -> FnbError
                                        isSelected -> FnbPrimary
                                        isCompleted -> FnbPrimaryVariant
                                        else -> FnbBorder
                                    }
                                ),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        viewModel.goToStep(step.number)
                                        showStepsSheet = false
                                    }
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(34.dp)
                                            .clip(CircleShape)
                                            .background(
                                                when {
                                                    isReworkStep -> FnbErrorBg
                                                    isSelected -> FnbPrimary
                                                    isCompleted -> FnbSuccess.copy(alpha = 0.2f)
                                                    else -> FnbBorder
                                                }
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        when {
                                            isReworkStep -> Icon(
                                                imageVector = Icons.Default.Warning,
                                                contentDescription = null,
                                                tint = FnbError,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            isCompleted -> Icon(
                                                imageVector = Icons.Default.Check,
                                                contentDescription = null,
                                                tint = FnbSuccess,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            else -> Text(
                                                text = "${step.number}",
                                                color = if (isSelected) FnbDarkBg else FnbTextSecondary,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp
                                            )
                                        }
                                    }

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "${step.number}. ${step.title}",
                                            color = if (isSelected) FnbPrimary else FnbTextPrimary,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                                            fontSize = 13.sp
                                        )
                                        Text(
                                            text = step.description,
                                            color = FnbTextSecondary,
                                            fontSize = 11.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }

                                    Surface(
                                        shape = RoundedCornerShape(4.dp),
                                        color = when {
                                            isReworkStep -> FnbErrorBg
                                            isSelected -> FnbPrimary
                                            isCompleted -> Color(0xFF132A1C)
                                            else -> FnbSurface
                                        }
                                    ) {
                                        Text(
                                            text = when {
                                                isReworkStep -> "Rework"
                                                isSelected -> "Current"
                                                isCompleted -> "Done ✓"
                                                else -> "Pending"
                                            },
                                            color = when {
                                                isReworkStep -> FnbError
                                                isSelected -> FnbDarkBg
                                                isCompleted -> FnbSuccess
                                                else -> FnbTextMuted
                                            },
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Active Step Content
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(scrollState)
                .padding(16.dp)
        ) {
            when (activeApp.currentStep) {
                1 -> Step1DocumentsView(viewModel, activeApp)
                2 -> Step2CompanyInfoView(viewModel, activeApp)
                3 -> Step3UbosView(viewModel, activeApp)
                4 -> Step4OwnershipView(viewModel, activeApp)
                5 -> Step5GovernanceView(viewModel, activeApp)
                6 -> Step6FatcaView(viewModel, activeApp)
                7 -> Step7ReviewView(viewModel, activeApp)
                else -> Step1DocumentsView(viewModel, activeApp)
            }
        }

        // Bottom Stepper Controls (Back & Next)
        Surface(
            color = FnbSurface,
            border = BorderStroke(1.dp, FnbBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (activeApp.currentStep > 1) {
                    OutlinedButton(
                        onClick = { viewModel.goToStep(activeApp.currentStep - 1) },
                        border = BorderStroke(1.dp, FnbBorder),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = FnbTextPrimary),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "Previous Step", fontSize = 12.sp)
                    }
                } else {
                    Spacer(modifier = Modifier.width(1.dp))
                }

                if (activeApp.currentStep < 7) {
                    Button(
                        onClick = { viewModel.goToStep(activeApp.currentStep + 1) },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = FnbPrimary,
                            contentColor = FnbDarkBg
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(text = "Next: Step ${activeApp.currentStep + 1}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                } else {
                    Button(
                        onClick = { viewModel.submitApplication() },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = FnbSuccess,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "Submit Application", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

// ---------------- STEP 1: DOCUMENTS ----------------

@Composable
fun Step1DocumentsView(viewModel: BankViewModel, app: OnboardingApplication) {
    var newDocTitle by remember { mutableStateOf("") }
    var showAddDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Welcome Header
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = FnbCard,
            border = BorderStroke(1.dp, FnbBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(FnbPrimaryBg),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Description,
                        contentDescription = null,
                        tint = FnbPrimary,
                        modifier = Modifier.size(22.dp)
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Step 1: Documents & Verification",
                        color = FnbTextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Text(
                        text = "Estimated time: 20–25 minutes. Upload your official company credentials for automated OCR extraction.",
                        color = FnbTextSecondary,
                        fontSize = 12.sp,
                        lineHeight = 16.sp
                    )
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "Required Corporate Credentials (${app.documents.count { it.isUploaded }}/${app.documents.size} Uploaded)",
                color = FnbTextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
            TextButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = null, tint = FnbPrimary, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = "Add Document", color = FnbPrimary, fontSize = 12.sp)
            }
        }

        // Documents Cards
        app.documents.forEach { doc ->
            Card(
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (doc.isUploaded) Color(0xFF132035) else FnbSurface
                ),
                border = BorderStroke(1.dp, if (doc.isUploaded) FnbPrimaryVariant else FnbBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                imageVector = if (doc.isUploaded) Icons.Default.Task else Icons.Default.UploadFile,
                                contentDescription = null,
                                tint = if (doc.isUploaded) FnbSuccess else FnbPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = doc.title,
                                        color = FnbTextPrimary,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 13.sp
                                    )
                                    if (doc.recommended) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Surface(
                                            shape = RoundedCornerShape(4.dp),
                                            color = FnbGoldBg
                                        ) {
                                            Text(
                                                text = "Required",
                                                color = FnbGold,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }
                                Text(
                                    text = if (doc.isUploaded) "${doc.fileName} · ${doc.fileSizeKb} KB · OCR: ${doc.ocrStatus}" else "Awaiting upload (PDF, PNG or JPG max 15MB)",
                                    color = if (doc.isUploaded) FnbSuccess else FnbTextSecondary,
                                    fontSize = 11.sp
                                )
                            }
                        }

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (doc.isUploaded) {
                                OutlinedButton(
                                    onClick = { viewModel.previewDocument(doc) },
                                    colors = ButtonDefaults.outlinedButtonColors(
                                        contentColor = FnbPrimary
                                    ),
                                    border = BorderStroke(1.dp, FnbPrimary.copy(alpha = 0.5f)),
                                    shape = RoundedCornerShape(6.dp),
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Visibility,
                                        contentDescription = null,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text(
                                        text = "Preview",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }

                            Button(
                                onClick = { viewModel.toggleDocument(doc.id) },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (doc.isUploaded) FnbErrorBg else FnbPrimaryBg,
                                    contentColor = if (doc.isUploaded) FnbError else FnbPrimary
                                ),
                                shape = RoundedCornerShape(6.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = if (doc.isUploaded) "Remove" else "Upload",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    if (doc.isUploaded && doc.extractedInfo.isNotBlank()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0x1F10B981),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.AutoAwesome,
                                    contentDescription = null,
                                    tint = FnbSuccess,
                                    modifier = Modifier.size(12.dp)
                                )
                                Text(
                                    text = "Auto-extracted: ${doc.extractedInfo}",
                                    color = FnbSuccess,
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Add Document Requirement", color = FnbTextPrimary, fontSize = 16.sp) },
            text = {
                OutlinedTextField(
                    value = newDocTitle,
                    onValueChange = { newDocTitle = it },
                    label = { Text("Document Title") },
                    placeholder = { Text("e.g. VAT Certificate / Power of Attorney") },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newDocTitle.isNotBlank()) {
                            viewModel.addCustomDoc(newDocTitle)
                            newDocTitle = ""
                            showAddDialog = false
                        }
                    }
                ) {
                    Text("Add")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) { Text("Cancel") }
            },
            containerColor = FnbSurface
        )
    }
}

// ---------------- STEP 2: COMPANY INFO ----------------

@Composable
fun Step2CompanyInfoView(viewModel: BankViewModel, app: OnboardingApplication) {
    var info by remember(app.companyInfo) { mutableStateOf(app.companyInfo) }

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text(
            text = "Step 2: Company Information",
            color = FnbTextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp
        )
        Text(
            text = "Verify the legal entity details registered with licensing authorities.",
            color = FnbTextSecondary,
            fontSize = 12.sp
        )

        OutlinedTextField(
            value = info.companyName,
            onValueChange = {
                info = info.copy(companyName = it)
                viewModel.updateCompanyInfo(info)
            },
            label = { Text("Company Legal Name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = FnbTextPrimary,
                unfocusedTextColor = FnbTextPrimary,
                focusedBorderColor = FnbPrimary,
                unfocusedBorderColor = FnbBorder
            )
        )

        OutlinedTextField(
            value = info.tradeName,
            onValueChange = {
                info = info.copy(tradeName = it)
                viewModel.updateCompanyInfo(info)
            },
            label = { Text("Trade Name (Doing Business As)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = FnbTextPrimary,
                unfocusedTextColor = FnbTextPrimary,
                focusedBorderColor = FnbPrimary,
                unfocusedBorderColor = FnbBorder
            )
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedTextField(
                value = info.crn,
                onValueChange = {
                    info = info.copy(crn = it)
                    viewModel.updateCompanyInfo(info)
                },
                label = { Text("CRN") },
                singleLine = true,
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = FnbTextPrimary,
                    unfocusedTextColor = FnbTextPrimary,
                    focusedBorderColor = FnbPrimary,
                    unfocusedBorderColor = FnbBorder
                )
            )

            OutlinedTextField(
                value = info.legalType,
                onValueChange = {
                    info = info.copy(legalType = it)
                    viewModel.updateCompanyInfo(info)
                },
                label = { Text("Legal Entity Type") },
                singleLine = true,
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = FnbTextPrimary,
                    unfocusedTextColor = FnbTextPrimary,
                    focusedBorderColor = FnbPrimary,
                    unfocusedBorderColor = FnbBorder
                )
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedTextField(
                value = info.issueDate,
                onValueChange = {
                    info = info.copy(issueDate = it)
                    viewModel.updateCompanyInfo(info)
                },
                label = { Text("Issue Date") },
                singleLine = true,
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = FnbTextPrimary,
                    unfocusedTextColor = FnbTextPrimary,
                    focusedBorderColor = FnbPrimary,
                    unfocusedBorderColor = FnbBorder
                )
            )

            OutlinedTextField(
                value = info.expiryDate,
                onValueChange = {
                    info = info.copy(expiryDate = it)
                    viewModel.updateCompanyInfo(info)
                },
                label = { Text("Expiry Date") },
                singleLine = true,
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = FnbTextPrimary,
                    unfocusedTextColor = FnbTextPrimary,
                    focusedBorderColor = FnbPrimary,
                    unfocusedBorderColor = FnbBorder
                )
            )
        }

        OutlinedTextField(
            value = info.issuedBy,
            onValueChange = {
                info = info.copy(issuedBy = it)
                viewModel.updateCompanyInfo(info)
            },
            label = { Text("Licensing Authority / Jurisdiction") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = FnbTextPrimary,
                unfocusedTextColor = FnbTextPrimary,
                focusedBorderColor = FnbPrimary,
                unfocusedBorderColor = FnbBorder
            )
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedTextField(
                value = info.vatTrn,
                onValueChange = {
                    info = info.copy(vatTrn = it)
                    viewModel.updateCompanyInfo(info)
                },
                label = { Text("Tax Registration (TRN / EIN)") },
                singleLine = true,
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = FnbTextPrimary,
                    unfocusedTextColor = FnbTextPrimary,
                    focusedBorderColor = FnbPrimary,
                    unfocusedBorderColor = FnbBorder
                )
            )

            OutlinedTextField(
                value = info.phone,
                onValueChange = {
                    info = info.copy(phone = it)
                    viewModel.updateCompanyInfo(info)
                },
                label = { Text("Corporate Phone") },
                singleLine = true,
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = FnbTextPrimary,
                    unfocusedTextColor = FnbTextPrimary,
                    focusedBorderColor = FnbPrimary,
                    unfocusedBorderColor = FnbBorder
                )
            )
        }

        OutlinedTextField(
            value = info.email,
            onValueChange = {
                info = info.copy(email = it)
                viewModel.updateCompanyInfo(info)
            },
            label = { Text("Corporate Registered Email") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = FnbTextPrimary,
                unfocusedTextColor = FnbTextPrimary,
                focusedBorderColor = FnbPrimary,
                unfocusedBorderColor = FnbBorder
            )
        )

        OutlinedTextField(
            value = info.contactPerson,
            onValueChange = {
                info = info.copy(contactPerson = it)
                viewModel.updateCompanyInfo(info)
            },
            label = { Text("Primary Authorized Signatory / Contact") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = FnbTextPrimary,
                unfocusedTextColor = FnbTextPrimary,
                focusedBorderColor = FnbPrimary,
                unfocusedBorderColor = FnbBorder
            )
        )

        OutlinedTextField(
            value = info.address,
            onValueChange = {
                info = info.copy(address = it)
                viewModel.updateCompanyInfo(info)
            },
            label = { Text("Registered Business Address") },
            singleLine = false,
            maxLines = 2,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = FnbTextPrimary,
                unfocusedTextColor = FnbTextPrimary,
                focusedBorderColor = FnbPrimary,
                unfocusedBorderColor = FnbBorder
            )
        )
    }
}

// ---------------- STEP 3: UBOS ----------------

@Composable
fun Step3UbosView(viewModel: BankViewModel, app: OnboardingApplication) {
    var showAddUboDialog by remember { mutableStateOf(false) }
    var uboName by remember { mutableStateOf("") }
    var uboNationality by remember { mutableStateOf("United States") }
    var uboPassport by remember { mutableStateOf("") }
    var uboDob by remember { mutableStateOf("1985-05-12") }
    var uboPct by remember { mutableStateOf("25") }
    var uboIsPep by remember { mutableStateOf(false) }

    val totalPct = app.ubos.sumOf { it.shareholdingPct }

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = "Step 3: Ultimate Beneficial Owners (UBO)",
                    color = FnbTextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Text(
                    text = "Individuals holding ≥ 25% ownership or voting rights. Total: ${totalPct}%",
                    color = if (totalPct == 100.0) FnbSuccess else FnbGold,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Button(
                onClick = { showAddUboDialog = true },
                colors = ButtonDefaults.buttonColors(
                    containerColor = FnbPrimaryBg,
                    contentColor = FnbPrimary
                ),
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = "Add UBO", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }

        if (app.ubos.isEmpty()) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = FnbSurface,
                border = BorderStroke(1.dp, FnbBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Default.Group, contentDescription = null, tint = FnbTextMuted, modifier = Modifier.size(28.dp))
                    Text(text = "No Beneficial Owners Added Yet", color = FnbTextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Text(
                        text = "Tap 'Add UBO' above to declare individuals holding 25% or more shares or voting rights.",
                        color = FnbTextSecondary,
                        fontSize = 11.sp,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
            }
        } else {
            app.ubos.forEach { ubo ->
            Card(
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = FnbCard),
                border = BorderStroke(1.dp, FnbBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
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
                                    .size(34.dp)
                                    .clip(CircleShape)
                                    .background(FnbPrimaryBg),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Person, contentDescription = null, tint = FnbPrimary, modifier = Modifier.size(18.dp))
                            }
                            Column {
                                Text(
                                    text = ubo.fullName,
                                    color = FnbTextPrimary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "${ubo.nationality} · ID/Passport: ${ubo.idPassportNumber}",
                                    color = FnbTextSecondary,
                                    fontSize = 11.sp
                                )
                            }
                        }
                        IconButton(onClick = { viewModel.removeUbo(ubo.id) }) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = FnbError, modifier = Modifier.size(18.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "Shareholding: ${ubo.shareholdingPct}%", color = FnbPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Text(text = "Voting Rights: ${ubo.votingRightsPct}%", color = FnbTextSecondary, fontSize = 12.sp)
                        Text(text = if (ubo.isPep) "PEP Declared ⚠️" else "Non-PEP ✓", color = if (ubo.isPep) FnbGold else FnbSuccess, fontSize = 11.sp)
                    }
                }
            }
        }
    }
    }

    if (showAddUboDialog) {
        AlertDialog(
            onDismissRequest = { showAddUboDialog = false },
            title = { Text("Add Beneficial Owner (UBO)", color = FnbTextPrimary, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = uboName,
                        onValueChange = { uboName = it },
                        label = { Text("Full Legal Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = uboNationality,
                        onValueChange = { uboNationality = it },
                        label = { Text("Nationality") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = uboPassport,
                        onValueChange = { uboPassport = it },
                        label = { Text("Passport / National ID") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = uboPct,
                        onValueChange = { uboPct = it },
                        label = { Text("Shareholding Percentage (%)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = uboDob,
                        onValueChange = { uboDob = it },
                        label = { Text("Date of Birth (YYYY-MM-DD)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable { uboIsPep = !uboIsPep }
                    ) {
                        Checkbox(checked = uboIsPep, onCheckedChange = { uboIsPep = it })
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Politically Exposed Person (PEP)", color = FnbTextPrimary, fontSize = 12.sp)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val pct = uboPct.toDoubleOrNull() ?: 25.0
                        viewModel.addUbo(uboName, uboNationality, uboPassport, uboDob, pct, uboIsPep)
                        showAddUboDialog = false
                    }
                ) {
                    Text("Add UBO")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddUboDialog = false }) { Text("Cancel") }
            },
            containerColor = FnbSurface
        )
    }
}

// ---------------- STEP 4: OWNERSHIP STRUCTURE ----------------

@Composable
fun Step4OwnershipView(viewModel: BankViewModel, app: OnboardingApplication) {
    var showAddShDialog by remember { mutableStateOf(false) }
    var shName by remember { mutableStateOf("") }
    var shCategory by remember { mutableStateOf("Individual") }
    var shShareClass by remember { mutableStateOf("Ordinary Voting Class A") }
    var shPct by remember { mutableStateOf("30") }
    var shCountry by remember { mutableStateOf("United States") }

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = "Step 4: Ownership Structure",
                    color = FnbTextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Text(
                    text = "Cap table shareholders & corporate holding layers",
                    color = FnbTextSecondary,
                    fontSize = 12.sp
                )
            }
            Button(
                onClick = { showAddShDialog = true },
                colors = ButtonDefaults.buttonColors(
                    containerColor = FnbPrimaryBg,
                    contentColor = FnbPrimary
                ),
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Icon(Icons.Default.GroupAdd, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = "Add Shareholder", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }

        if (app.ownership.isEmpty()) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = FnbSurface,
                border = BorderStroke(1.dp, FnbBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Default.AccountTree, contentDescription = null, tint = FnbTextMuted, modifier = Modifier.size(28.dp))
                    Text(text = "No Shareholders Added Yet", color = FnbTextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Text(
                        text = "Tap 'Add Shareholder' above to record equity owners, holding trusts, and corporate entities.",
                        color = FnbTextSecondary,
                        fontSize = 11.sp,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
            }
        } else {
            app.ownership.forEach { sh ->
            Card(
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (sh.isFlaggedForRework) Color(0xFF261318) else FnbCard
                ),
                border = BorderStroke(1.dp, if (sh.isFlaggedForRework) FnbError else FnbBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = sh.name,
                                    color = FnbTextPrimary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                if (sh.isFlaggedForRework) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Surface(
                                        shape = RoundedCornerShape(4.dp),
                                        color = FnbErrorBg,
                                        border = BorderStroke(1.dp, FnbError)
                                    ) {
                                        Text(
                                            text = "Flagged for Rework",
                                            color = FnbError,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                            Text(
                                text = "Category: ${sh.category} · Jurisdiction: ${sh.country} · Class: ${sh.shareClass}",
                                color = FnbTextSecondary,
                                fontSize = 11.sp
                            )
                        }

                        IconButton(onClick = { viewModel.removeShareholder(sh.id) }) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = FnbError, modifier = Modifier.size(18.dp))
                        }
                    }

                    if (sh.isFlaggedForRework && sh.reworkNotes.isNotBlank()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Compliance note: ${sh.reworkNotes}",
                            color = FnbError,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "Ownership: ${sh.percentage}%", color = FnbPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Text(text = "Voting: ${sh.votingRightsPct}%", color = FnbTextSecondary, fontSize = 12.sp)
                    }
                }
            }
        }
    }
    }

    if (showAddShDialog) {
        AlertDialog(
            onDismissRequest = { showAddShDialog = false },
            title = { Text("Add Shareholder", color = FnbTextPrimary, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = shName,
                        onValueChange = { shName = it },
                        label = { Text("Shareholder Legal Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = shCategory,
                        onValueChange = { shCategory = it },
                        label = { Text("Category (Individual, Trust, Corporate)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = shShareClass,
                        onValueChange = { shShareClass = it },
                        label = { Text("Share Class (e.g. Ordinary Class A)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = shPct,
                        onValueChange = { shPct = it },
                        label = { Text("Percentage (%)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = shCountry,
                        onValueChange = { shCountry = it },
                        label = { Text("Country") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val pct = shPct.toDoubleOrNull() ?: 20.0
                        viewModel.addShareholder(shName, shCategory, pct, shShareClass, shCountry)
                        showAddShDialog = false
                    }
                ) {
                    Text("Add")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddShDialog = false }) { Text("Cancel") }
            },
            containerColor = FnbSurface
        )
    }
}

// ---------------- STEP 5: GOVERNANCE ----------------

@Composable
fun Step5GovernanceView(viewModel: BankViewModel, app: OnboardingApplication) {
    var showAddRoleDialog by remember { mutableStateOf(false) }
    var roleName by remember { mutableStateOf("") }
    var roleTitle by remember { mutableStateOf("Managing Director") }
    var roleAuthority by remember { mutableStateOf("Sole Signatory") }

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = "Step 5: Corporate Governance & Roles",
                    color = FnbTextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Text(
                    text = "Authorized signatories, board directors, and signing powers",
                    color = FnbTextSecondary,
                    fontSize = 12.sp
                )
            }
            Button(
                onClick = { showAddRoleDialog = true },
                colors = ButtonDefaults.buttonColors(
                    containerColor = FnbPrimaryBg,
                    contentColor = FnbPrimary
                ),
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Icon(Icons.Default.AddModerator, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = "Add Role", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }

        if (app.roles.isEmpty()) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = FnbSurface,
                border = BorderStroke(1.dp, FnbBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Default.AddModerator, contentDescription = null, tint = FnbTextMuted, modifier = Modifier.size(28.dp))
                    Text(text = "No Signatories Added Yet", color = FnbTextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Text(
                        text = "Tap 'Add Role' above to assign authorized signatories, corporate secretaries, and managing directors.",
                        color = FnbTextSecondary,
                        fontSize = 11.sp,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
            }
        } else {
            app.roles.forEach { role ->
            Card(
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = FnbCard),
                border = BorderStroke(1.dp, FnbBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(CircleShape)
                                .background(FnbPrimaryBg),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Badge, contentDescription = null, tint = FnbPrimary, modifier = Modifier.size(18.dp))
                        }
                        Column {
                            Text(
                                text = role.name,
                                color = FnbTextPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Text(
                                text = "${role.title} · ${role.authorityLevel}",
                                color = FnbTextSecondary,
                                fontSize = 11.sp
                            )
                            Text(
                                text = "Specimen signature: Verified ✓",
                                color = FnbSuccess,
                                fontSize = 10.sp
                            )
                        }
                    }
                    IconButton(onClick = { viewModel.removeRole(role.id) }) {
                        Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = FnbError, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
    }

    if (showAddRoleDialog) {
        AlertDialog(
            onDismissRequest = { showAddRoleDialog = false },
            title = { Text("Add Corporate Signatory", color = FnbTextPrimary, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = roleName,
                        onValueChange = { roleName = it },
                        label = { Text("Full Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = roleTitle,
                        onValueChange = { roleTitle = it },
                        label = { Text("Role Title (e.g. CEO, CFO, Director)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = roleAuthority,
                        onValueChange = { roleAuthority = it },
                        label = { Text("Authority (Sole Signatory, Joint Signatory)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.addRole(roleName, roleTitle, roleAuthority)
                        showAddRoleDialog = false
                    }
                ) {
                    Text("Add")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddRoleDialog = false }) { Text("Cancel") }
            },
            containerColor = FnbSurface
        )
    }
}

// ---------------- STEP 6: FATCA & CRS ----------------

@Composable
fun Step6FatcaView(viewModel: BankViewModel, app: OnboardingApplication) {
    var fatca by remember(app.fatcaCrs) { mutableStateOf(app.fatcaCrs) }

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text(
            text = "Step 6: FATCA & CRS Tax Compliance",
            color = FnbTextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp
        )
        Text(
            text = "US Foreign Account Tax Compliance Act (FATCA) and Common Reporting Standard (CRS) regulatory certifications.",
            color = FnbTextSecondary,
            fontSize = 12.sp
        )

        Card(
            shape = RoundedCornerShape(10.dp),
            colors = CardDefaults.cardColors(containerColor = FnbCard),
            border = BorderStroke(1.dp, FnbBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = "US Person or US Entity?", color = FnbTextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        Text(text = "Is the company incorporated or created under the laws of the US?", color = FnbTextSecondary, fontSize = 11.sp)
                    }
                    Switch(
                        checked = fatca.isUsPerson,
                        onCheckedChange = {
                            fatca = fatca.copy(isUsPerson = it)
                            viewModel.updateFatca(fatca)
                        },
                        colors = SwitchDefaults.colors(checkedThumbColor = FnbPrimary, checkedTrackColor = FnbPrimaryBg)
                    )
                }

                if (fatca.isUsPerson) {
                    OutlinedTextField(
                        value = fatca.usTin,
                        onValueChange = {
                            fatca = fatca.copy(usTin = it)
                            viewModel.updateFatca(fatca)
                        },
                        label = { Text("US Tax Identification Number (TIN / EIN)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                OutlinedTextField(
                    value = fatca.primaryTaxCountry,
                    onValueChange = {
                        fatca = fatca.copy(primaryTaxCountry = it)
                        viewModel.updateFatca(fatca)
                    },
                    label = { Text("Primary Tax Residency Country") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = fatca.taxIdNumber,
                    onValueChange = {
                        fatca = fatca.copy(taxIdNumber = it)
                        viewModel.updateFatca(fatca)
                    },
                    label = { Text("Local Tax Identification Number (TIN)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = fatca.entityClassification,
                    onValueChange = {
                        fatca = fatca.copy(entityClassification = it)
                        viewModel.updateFatca(fatca)
                    },
                    label = { Text("Entity Classification under FATCA") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = fatca.crsConfirmed,
                        onCheckedChange = {
                            fatca = fatca.copy(crsConfirmed = it)
                            viewModel.updateFatca(fatca)
                        },
                        colors = CheckboxDefaults.colors(checkedColor = FnbPrimary)
                    )
                    Text(
                        text = "I certify under penalties of perjury that all tax residency details are true, correct and complete under CRS regulations.",
                        color = FnbTextSecondary,
                        fontSize = 11.sp,
                        lineHeight = 15.sp
                    )
                }
            }
        }
    }
}

// ---------------- STEP 7: REVIEW & SUBMIT ----------------

@Composable
fun Step7ReviewView(viewModel: BankViewModel, app: OnboardingApplication) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = Color(0x1F10B981),
            border = BorderStroke(1.dp, Color(0x4010B981)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Icon(Icons.Default.Verified, contentDescription = null, tint = FnbSuccess, modifier = Modifier.size(28.dp))
                Column {
                    Text(
                        text = "Step 7: Review & Final Submission",
                        color = FnbTextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Text(
                        text = "All required sections are verified and ready for compliance officer submission.",
                        color = FnbTextSecondary,
                        fontSize = 12.sp
                    )
                }
            }
        }

        // Summary Card
        Card(
            shape = RoundedCornerShape(10.dp),
            colors = CardDefaults.cardColors(containerColor = FnbCard),
            border = BorderStroke(1.dp, FnbBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ReviewItemRow(
                    label = "Corporate Entity",
                    value = "${app.companyInfo.companyName} (CRN: ${app.crn})",
                    onEdit = { viewModel.goToStep(2) }
                )
                HorizontalDivider(color = FnbBorder)
                ReviewItemRow(
                    label = "Uploaded Credentials",
                    value = "${app.documents.count { it.isUploaded }} of ${app.documents.size} verified",
                    onEdit = { viewModel.goToStep(1) }
                )
                HorizontalDivider(color = FnbBorder)
                ReviewItemRow(
                    label = "UBO Beneficiaries",
                    value = "${app.ubos.size} registered (${app.ubos.joinToString { it.fullName }})",
                    onEdit = { viewModel.goToStep(3) }
                )
                HorizontalDivider(color = FnbBorder)
                ReviewItemRow(
                    label = "Ownership Structure",
                    value = "${app.ownership.size} shareholders listed",
                    onEdit = { viewModel.goToStep(4) }
                )
                HorizontalDivider(color = FnbBorder)
                ReviewItemRow(
                    label = "Governance & Signatories",
                    value = "${app.roles.size} authorized signatories",
                    onEdit = { viewModel.goToStep(5) }
                )
                HorizontalDivider(color = FnbBorder)
                ReviewItemRow(
                    label = "Tax Residency (CRS)",
                    value = "${app.fatcaCrs.primaryTaxCountry} · TIN: ${app.fatcaCrs.taxIdNumber}",
                    onEdit = { viewModel.goToStep(6) }
                )
            }
        }

        // Declaration
        Surface(
            shape = RoundedCornerShape(10.dp),
            color = FnbSurface,
            border = BorderStroke(1.dp, FnbBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(Icons.Default.Security, contentDescription = null, tint = FnbPrimary, modifier = Modifier.size(20.dp))
                Text(
                    text = "By submitting, you confirm that you are an authorized representative of the entity and declare that all submitted information and documents are authentic, unaltered, and complete.",
                    color = FnbTextSecondary,
                    fontSize = 11.sp,
                    lineHeight = 16.sp
                )
            }
        }
    }
}

@Composable
fun ReviewItemRow(label: String, value: String, onEdit: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = label, color = FnbTextSecondary, fontSize = 11.sp)
            Text(text = value, color = FnbTextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        }
        TextButton(onClick = onEdit) {
            Text(text = "Edit", color = FnbPrimary, fontSize = 11.sp)
        }
    }
}
