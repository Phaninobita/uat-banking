package com.example.ui.screens

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.MobileAuditLog
import com.example.model.RmInvitation
import com.example.ui.AppView
import com.example.ui.BankViewModel
import com.example.ui.theme.*

@Composable
fun RmExecutiveScreen(
    viewModel: BankViewModel
) {
    val currentRmUser by viewModel.currentRmUser.collectAsState()

    if (currentRmUser == null) {
        RmLoginView(viewModel)
    } else {
        RmDashboardView(viewModel)
    }
}

@Composable
fun RmLoginView(viewModel: BankViewModel) {
    val staffId by viewModel.rmStaffIdInput.collectAsState()
    val passkey by viewModel.rmPasskeyInput.collectAsState()
    val error by viewModel.rmLoginError.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(FnbDarkBg)
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 440.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = FnbSurface),
            border = BorderStroke(1.dp, FnbGoldDark)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(FnbGoldBg),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.VpnKey,
                        contentDescription = null,
                        tint = FnbGold,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = "RM Executive Suite",
                    color = FnbTextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp
                )
                Text(
                    text = "Relationship Manager Command Center",
                    color = FnbGold,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(top = 2.dp, bottom = 18.dp)
                )

                if (error != null) {
                    Surface(
                        color = FnbErrorBg,
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, FnbError),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 14.dp)
                    ) {
                        Text(
                            text = error ?: "",
                            color = FnbTextPrimary,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }

                OutlinedTextField(
                    value = staffId,
                    onValueChange = { viewModel.rmStaffIdInput.value = it },
                    label = { Text("Executive Staff ID") },
                    placeholder = { Text("phanee") },
                    leadingIcon = { Icon(Icons.Default.Badge, contentDescription = null, tint = FnbGold) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = FnbTextPrimary,
                        unfocusedTextColor = FnbTextPrimary,
                        focusedBorderColor = FnbGold,
                        unfocusedBorderColor = FnbBorder,
                        focusedContainerColor = FnbCard,
                        unfocusedContainerColor = FnbCard
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = passkey,
                    onValueChange = { viewModel.rmPasskeyInput.value = it },
                    label = { Text("Executive Security Passkey") },
                    placeholder = { Text("Visionbank@324") },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = FnbGold) },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = FnbTextPrimary,
                        unfocusedTextColor = FnbTextPrimary,
                        focusedBorderColor = FnbGold,
                        unfocusedBorderColor = FnbBorder,
                        focusedContainerColor = FnbCard,
                        unfocusedContainerColor = FnbCard
                    )
                )

                Spacer(modifier = Modifier.height(14.dp))

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = FnbGoldBg,
                    border = BorderStroke(1.dp, Color(0x40F59E0B)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { viewModel.fillDemoRmCredentials() }
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(text = "Demo RM Credentials", color = FnbGold, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                            Text(text = "phanee / Visionbank@324", color = FnbTextSecondary, fontSize = 10.sp)
                        }
                        Text(text = "⚡ Click to Login", color = FnbGold, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                Button(
                    onClick = { viewModel.loginRm() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(46.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = FnbGold,
                        contentColor = FnbDarkBg
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(text = "Authenticate & Open RM Suite", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }

                Spacer(modifier = Modifier.height(12.dp))

                TextButton(
                    onClick = { viewModel.selectTab(com.example.ui.MobileTab.BANKING) }
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = FnbTextSecondary, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = "Return to Core Banking", color = FnbTextSecondary, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun RmDashboardView(viewModel: BankViewModel) {
    val currentRm by viewModel.currentRmUser.collectAsState()
    val invitations by viewModel.rmInvitations.collectAsState()
    val searchQuery by viewModel.pipelineSearch.collectAsState()

    val activeTab by viewModel.rmActiveViewTab.collectAsState()
    val auditLogs by viewModel.auditLogs.collectAsState()
    val auditSearch by viewModel.auditSearch.collectAsState()
    val auditFilter by viewModel.auditFilter.collectAsState()
    val context = LocalContext.current

    val crn by viewModel.inviteCrn.collectAsState()
    val email by viewModel.inviteEmail.collectAsState()
    val company by viewModel.inviteCompany.collectAsState()
    val contact by viewModel.inviteContact.collectAsState()
    val phone by viewModel.invitePhone.collectAsState()
    val notes by viewModel.inviteNotes.collectAsState()

    val pipelineCurrentPage by viewModel.pipelineCurrentPage.collectAsState()
    val pipelinePageSize = viewModel.pipelinePageSize

    val filteredInvites = invitations.filter { inv ->
        searchQuery.isBlank() ||
                inv.companyName.contains(searchQuery, ignoreCase = true) ||
                inv.crn.contains(searchQuery, ignoreCase = true) ||
                inv.email.contains(searchQuery, ignoreCase = true)
    }

    val totalPipelinePages = maxOf(1, kotlin.math.ceil(filteredInvites.size.toDouble() / pipelinePageSize).toInt())
    val safePipelinePage = pipelineCurrentPage.coerceIn(1, totalPipelinePages)
    val pagedInvites = filteredInvites.drop((safePipelinePage - 1) * pipelinePageSize).take(pipelinePageSize)

    LaunchedEffect(Unit) {
        viewModel.refreshRmInvitations(silent = true)
        viewModel.refreshAuditLogs(silent = true)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FnbDarkBg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // RM Header Profile Card
        Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = FnbSurface),
            border = BorderStroke(1.dp, FnbGoldDark),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .clip(CircleShape)
                            .background(FnbGoldBg),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "RM", color = FnbGold, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = currentRm?.fullName ?: "Phanee",
                                color = FnbTextPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = FnbGoldBg
                            ) {
                                Text(
                                    text = "RM-PHANEE",
                                    color = FnbGold,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Text(
                            text = "${currentRm?.role} · ${currentRm?.branch}",
                            color = FnbTextSecondary,
                            fontSize = 11.sp
                        )
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {

                    FilledTonalButton(
                        onClick = {
                            viewModel.refreshRmInvitations(silent = false)
                            viewModel.refreshAuditLogs(silent = true)
                        },
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = FnbGoldBg,
                            contentColor = FnbGold
                        ),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", modifier = Modifier.size(13.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "Refresh", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }

                    Button(
                        onClick = { viewModel.signOutRm() },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = FnbCard,
                            contentColor = FnbTextSecondary
                        ),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text(text = "Sign Out", fontSize = 11.sp)
                    }
                }
            }
        }

        // Metrics Grid
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            RmMetricTile("Invitations", "${invitations.size}", FnbGold, Modifier.weight(1f))
            RmMetricTile("In Progress", "${invitations.count { it.status.equals("in_progress", ignoreCase = true) }}", FnbPrimary, Modifier.weight(1f))
            RmMetricTile("KYC Review", "${invitations.count { it.status.equals("kyc_review", ignoreCase = true) || it.status.equals("under_review", ignoreCase = true) }}", Color(0xFFF59E0B), Modifier.weight(1f))
            RmMetricTile("Activated", "${invitations.count { it.status.equals("completed", ignoreCase = true) || it.status.equals("approved", ignoreCase = true) }}", FnbSuccess, Modifier.weight(1f))
        }

        // Dispatch Customer Onboarding Link Card (Exact match to Web Portal)
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
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Header with Badge matching Web Portal
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFF1E293B)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Send,
                            contentDescription = null,
                            tint = FnbGold,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Dispatch Customer Onboarding Link",
                            color = FnbTextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Text(
                            text = "Enter CRN and Email to generate dedicated access link",
                            color = FnbTextSecondary,
                            fontSize = 10.sp
                        )
                    }
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFF1E1E2E),
                        border = BorderStroke(1.dp, FnbGoldDark)
                    ) {
                        Text(
                            text = "Direct Client Verification",
                            color = FnbGold,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                        )
                    }
                }

                HorizontalDivider(color = FnbBorder, thickness = 1.dp)

                // Row 1: CRN * and Email * (Primary Key Pair)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Field 1: Commercial Registration No. (CRN) *
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Row {
                            Text("Commercial Reg No (CRN)", color = FnbTextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                            Text(" *", color = Color(0xFFEF4444), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        OutlinedTextField(
                            value = crn,
                            onValueChange = { viewModel.inviteCrn.value = it },
                            placeholder = { Text("e.g. 10029481", color = FnbTextSecondary, fontSize = 11.sp) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = FnbTextPrimary,
                                unfocusedTextColor = FnbTextPrimary,
                                focusedBorderColor = FnbGold,
                                unfocusedBorderColor = FnbBorder,
                                focusedContainerColor = Color(0xFF0F172A),
                                unfocusedContainerColor = Color(0xFF0F172A)
                            )
                        )
                    }

                    // Field 2: Customer Corporate Email *
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Row {
                            Text("Corporate Email", color = FnbTextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                            Text(" *", color = Color(0xFFEF4444), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        OutlinedTextField(
                            value = email,
                            onValueChange = { viewModel.inviteEmail.value = it },
                            placeholder = { Text("e.g. finance@corp.com", color = FnbTextSecondary, fontSize = 11.sp) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = FnbTextPrimary,
                                unfocusedTextColor = FnbTextPrimary,
                                focusedBorderColor = FnbGold,
                                unfocusedBorderColor = FnbBorder,
                                focusedContainerColor = Color(0xFF0F172A),
                                unfocusedContainerColor = Color(0xFF0F172A)
                            )
                        )
                    }
                }

                // Field 3: Company Legal Name *
                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Row {
                        Text("Company Legal Name", color = FnbTextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                        Text(" *", color = Color(0xFFEF4444), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    OutlinedTextField(
                        value = company,
                        onValueChange = { viewModel.inviteCompany.value = it },
                        placeholder = { Text("e.g. Global Holdings Inc.", color = FnbTextSecondary, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = FnbTextPrimary,
                            unfocusedTextColor = FnbTextPrimary,
                            focusedBorderColor = FnbGold,
                            unfocusedBorderColor = FnbBorder,
                            focusedContainerColor = Color(0xFF0F172A),
                            unfocusedContainerColor = Color(0xFF0F172A)
                        )
                    )
                }

                // Row 2: Authorized Signatory & Contact Phone
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Field 4: Authorized Signatory / Contact Person
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Text("Signatory / Contact", color = FnbTextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                        OutlinedTextField(
                            value = contact,
                            onValueChange = { viewModel.inviteContact.value = it },
                            placeholder = { Text("e.g. Michael Vance", color = FnbTextSecondary, fontSize = 11.sp) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = FnbTextPrimary,
                                unfocusedTextColor = FnbTextPrimary,
                                focusedBorderColor = FnbGold,
                                unfocusedBorderColor = FnbBorder,
                                focusedContainerColor = Color(0xFF0F172A),
                                unfocusedContainerColor = Color(0xFF0F172A)
                            )
                        )
                    }

                    // Field 5: Direct Contact Phone
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Text("Direct Contact Phone", color = FnbTextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                        OutlinedTextField(
                            value = phone,
                            onValueChange = { viewModel.invitePhone.value = it },
                            placeholder = { Text("e.g. +1 212 555 0199", color = FnbTextSecondary, fontSize = 11.sp) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = FnbTextPrimary,
                                unfocusedTextColor = FnbTextPrimary,
                                focusedBorderColor = FnbGold,
                                unfocusedBorderColor = FnbBorder,
                                focusedContainerColor = Color(0xFF0F172A),
                                unfocusedContainerColor = Color(0xFF0F172A)
                            )
                        )
                    }
                }

                // Field 6: Internal RM Relationship Notes / Tier
                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text("Internal RM Relationship Notes / Tier", color = FnbTextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                    OutlinedTextField(
                        value = notes,
                        onValueChange = { viewModel.inviteNotes.value = it },
                        placeholder = { Text("e.g. Tier 1 Conglomerate, priority onboarding VIP fast-track", color = FnbTextSecondary, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = FnbTextPrimary,
                            unfocusedTextColor = FnbTextPrimary,
                            focusedBorderColor = FnbGold,
                            unfocusedBorderColor = FnbBorder,
                            focusedContainerColor = Color(0xFF0F172A),
                            unfocusedContainerColor = Color(0xFF0F172A)
                        )
                    )
                }

                Spacer(modifier = Modifier.height(2.dp))

                // Action Buttons Row: [Clear Form] & [🚀 Dispatch Customer Invitation & Generate Magic Link]
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = { viewModel.clearInviteForm() },
                        modifier = Modifier
                            .weight(0.32f)
                            .height(44.dp),
                        border = BorderStroke(1.dp, FnbBorder),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = FnbTextSecondary,
                            containerColor = Color(0xFF1E293B)
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(text = "Clear Form", fontSize = 11.sp, fontWeight = FontWeight.Medium)
                    }

                    Button(
                        onClick = { viewModel.dispatchInvitation() },
                        modifier = Modifier
                            .weight(0.68f)
                            .height(44.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF0284C7),
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(text = "🚀 Dispatch Customer Invitation", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    }
                }
            }
        }

        // Segmented Switcher: Invitations Pipeline vs Mobile Audit Trail
        Card(
            shape = RoundedCornerShape(10.dp),
            colors = CardDefaults.cardColors(containerColor = FnbSurface),
            border = BorderStroke(1.dp, FnbBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { viewModel.rmActiveViewTab.value = "PIPELINE" },
                    modifier = Modifier
                        .weight(1f)
                        .height(40.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (activeTab == "PIPELINE") FnbGold else FnbCard,
                        contentColor = if (activeTab == "PIPELINE") FnbDarkBg else FnbTextSecondary
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "📋 Pipeline (${invitations.size})",
                        fontSize = 11.sp,
                        fontWeight = if (activeTab == "PIPELINE") FontWeight.Bold else FontWeight.Medium
                    )
                }

                Button(
                    onClick = { viewModel.rmActiveViewTab.value = "AUDIT_LOGS" },
                    modifier = Modifier
                        .weight(1f)
                        .height(40.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (activeTab == "AUDIT_LOGS") FnbGold else FnbCard,
                        contentColor = if (activeTab == "AUDIT_LOGS") FnbDarkBg else FnbTextSecondary
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "🛡️ Audit Trail (${auditLogs.size})",
                        fontSize = 11.sp,
                        fontWeight = if (activeTab == "AUDIT_LOGS") FontWeight.Bold else FontWeight.Medium
                    )
                }
            }
        }

        if (activeTab == "PIPELINE") {
            // Pipeline Table / List
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = "Customer Onboarding Pipeline",
                            color = FnbTextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Text(
                            text = "${filteredInvites.size} invitations · Page $safePipelinePage of $totalPipelinePages",
                            color = FnbTextSecondary,
                            fontSize = 11.sp
                        )
                    }

                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { viewModel.onPipelineSearchChanged(it) },
                        placeholder = { Text("Search pipeline...", fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.width(170.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = FnbTextPrimary,
                            unfocusedTextColor = FnbTextPrimary,
                            focusedBorderColor = FnbGold,
                            unfocusedBorderColor = FnbBorder,
                            focusedContainerColor = FnbSurface,
                            unfocusedContainerColor = FnbSurface
                        )
                    )
                }

                if (filteredInvites.isEmpty()) {
                    Card(
                        shape = RoundedCornerShape(10.dp),
                        colors = CardDefaults.cardColors(containerColor = FnbSurface),
                        border = BorderStroke(1.dp, FnbBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No customer invitations found. Dispatch an invitation above to get started.",
                                color = FnbTextSecondary,
                                fontSize = 12.sp
                            )
                        }
                    }
                } else {
                    if (totalPipelinePages > 1) {
                        PaginationBar(
                            currentPage = safePipelinePage,
                            totalPages = totalPipelinePages,
                            totalItems = filteredInvites.size,
                            pageSize = pipelinePageSize,
                            onPageChange = { viewModel.setPipelinePage(it) }
                        )
                    }

                    pagedInvites.forEach { invite ->
                        CustomerInvitationCard(
                            invite = invite,
                            viewModel = viewModel
                        )
                    }

                    PaginationBar(
                        currentPage = safePipelinePage,
                        totalPages = totalPipelinePages,
                        totalItems = filteredInvites.size,
                        pageSize = pipelinePageSize,
                        onPageChange = { viewModel.setPipelinePage(it) }
                    )
                }
            }
        } else {
            // Dedicated Mobile Audit Trail Section
            RmAuditLogsSection(
                viewModel = viewModel,
                auditLogs = auditLogs,
                searchQuery = auditSearch,
                filterType = auditFilter,
                context = context
            )
        }
    }
}

@Composable
fun RmAuditLogsSection(
    viewModel: BankViewModel,
    auditLogs: List<MobileAuditLog>,
    searchQuery: String,
    filterType: String,
    context: android.content.Context
) {
    val filteredLogs = auditLogs.filter { log ->
        val matchesFilter = when (filterType) {
            "LOGINS" -> log.actionType.contains("LOGIN") || log.actionType.contains("LOGOUT")
            "DISPATCHES" -> log.actionType.contains("INVITATION")
            "ONBOARDING" -> log.actionType.contains("STEP") || log.actionType.contains("CUSTOMER")
            "SYSTEM" -> log.actionType.contains("SYNC") || log.actionType.contains("BOOT")
            else -> true
        }
        val matchesQuery = searchQuery.isBlank() ||
                log.actionType.contains(searchQuery, ignoreCase = true) ||
                log.actorName.contains(searchQuery, ignoreCase = true) ||
                log.actorId.contains(searchQuery, ignoreCase = true) ||
                log.details.contains(searchQuery, ignoreCase = true) ||
                (log.targetCrn?.contains(searchQuery, ignoreCase = true) == true) ||
                (log.targetEmail?.contains(searchQuery, ignoreCase = true) == true) ||
                (log.targetCompany?.contains(searchQuery, ignoreCase = true) == true)
        matchesFilter && matchesQuery
    }

    val auditCurrentPage by viewModel.auditCurrentPage.collectAsState()
    val auditPageSize = viewModel.auditPageSize
    val totalAuditPages = maxOf(1, kotlin.math.ceil(filteredLogs.size.toDouble() / auditPageSize).toInt())
    val safeAuditPage = auditCurrentPage.coerceIn(1, totalAuditPages)
    val pagedLogs = filteredLogs.drop((safeAuditPage - 1) * auditPageSize).take(auditPageSize)

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Audit Header & DB Information
        Card(
            shape = RoundedCornerShape(10.dp),
            colors = CardDefaults.cardColors(containerColor = FnbSurface),
            border = BorderStroke(1.dp, Color(0xFF334155)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Mobile Action Audit Trail",
                                color = FnbTextPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Color(0xFF064E3B)
                            ) {
                                Text(
                                    text = "Compliance Verified",
                                    color = Color(0xFF34D399),
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Text(
                            text = "Tracks client onboarding activities, verification steps, and invitations.",
                            color = FnbTextSecondary,
                            fontSize = 11.sp
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {

                        FilledTonalButton(
                            onClick = { viewModel.refreshAuditLogs(silent = false) },
                            shape = RoundedCornerShape(6.dp),
                            colors = ButtonDefaults.filledTonalButtonColors(
                                containerColor = FnbGoldBg,
                                contentColor = FnbGold
                            ),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(text = "Sync", fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }

                // Filter Chips Row
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val filterOptions = listOf(
                        "ALL" to "All Logs (${auditLogs.size})",
                        "LOGINS" to "🔑 Logins (${auditLogs.count { it.actionType.contains("LOGIN") || it.actionType.contains("LOGOUT") }})",
                        "DISPATCHES" to "🚀 Dispatches (${auditLogs.count { it.actionType.contains("INVITATION") }})",
                        "ONBOARDING" to "📝 Onboarding (${auditLogs.count { it.actionType.contains("STEP") || it.actionType.contains("CUSTOMER") }})",
                        "SYSTEM" to "⚡ System Sync (${auditLogs.count { it.actionType.contains("SYNC") || it.actionType.contains("BOOT") }})"
                    )

                    filterOptions.forEach { (key, label) ->
                        val isSelected = filterType == key
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = if (isSelected) FnbGold else FnbCard,
                            border = BorderStroke(1.dp, if (isSelected) FnbGold else FnbBorder),
                            modifier = Modifier.clickable { viewModel.onAuditFilterChanged(key) }
                        ) {
                            Text(
                                text = label,
                                color = if (isSelected) FnbDarkBg else FnbTextSecondary,
                                fontSize = 10.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            )
                        }
                    }
                }

                // Search Box
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { viewModel.onAuditSearchChanged(it) },
                    placeholder = { Text("Filter audit logs by actor, CRN, email, or action...", fontSize = 11.sp) },
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = FnbTextSecondary, modifier = Modifier.size(16.dp)) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = FnbTextPrimary,
                        unfocusedTextColor = FnbTextPrimary,
                        focusedBorderColor = FnbGold,
                        unfocusedBorderColor = FnbBorder,
                        focusedContainerColor = FnbCard,
                        unfocusedContainerColor = FnbCard
                    )
                )
            }
        }

        // Audit Logs List
        if (filteredLogs.isEmpty()) {
            Card(
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = FnbSurface),
                border = BorderStroke(1.dp, FnbBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No audit events match current search or category filter.",
                        color = FnbTextSecondary,
                        fontSize = 12.sp
                    )
                }
            }
        } else {
            if (totalAuditPages > 1) {
                PaginationBar(
                    currentPage = safeAuditPage,
                    totalPages = totalAuditPages,
                    totalItems = filteredLogs.size,
                    pageSize = auditPageSize,
                    onPageChange = { viewModel.setAuditPage(it) }
                )
            }

            pagedLogs.forEach { log ->
                AuditLogCard(log = log)
            }

            PaginationBar(
                currentPage = safeAuditPage,
                totalPages = totalAuditPages,
                totalItems = filteredLogs.size,
                pageSize = auditPageSize,
                onPageChange = { viewModel.setAuditPage(it) }
            )
        }
    }
}

@Composable
fun AuditLogCard(log: MobileAuditLog) {
    val (actionBadgeBg, actionBadgeColor, actionIcon) = when {
        log.actionType.contains("LOGIN") -> Triple(Color(0xFF064E3B), Color(0xFF34D399), Icons.Default.Lock)
        log.actionType.contains("LOGOUT") -> Triple(Color(0xFF1E293B), Color(0xFF94A3B8), Icons.Default.ExitToApp)
        log.actionType.contains("DISPATCHED") -> Triple(Color(0xFF451A03), Color(0xFFFBBF24), Icons.Default.Send)
        log.actionType.contains("RESENT") -> Triple(Color(0xFF083344), Color(0xFF38BDF8), Icons.Default.Refresh)
        log.actionType.contains("STEP") -> Triple(Color(0xFF2E1065), Color(0xFFA78BFA), Icons.Default.CheckCircle)
        log.actionType.contains("SYNC") -> Triple(Color(0xFF172554), Color(0xFF60A5FA), Icons.Default.Sync)
        else -> Triple(FnbGoldBg, FnbGold, Icons.Default.Info)
    }

    Card(
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = FnbSurface),
        border = BorderStroke(1.dp, Color(0xFF262626)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            // Header Row: Action Tag + Status + Timestamp
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = actionBadgeBg
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(actionIcon, contentDescription = null, tint = actionBadgeColor, modifier = Modifier.size(11.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = log.actionType.replace("_", " "),
                                color = actionBadgeColor,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = if (log.status == "SUCCESS") Color(0x2010B981) else Color(0x20EF4444)
                    ) {
                        Text(
                            text = log.status,
                            color = if (log.status == "SUCCESS") Color(0xFF10B981) else Color(0xFFEF4444),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                        )
                    }
                }

                Text(
                    text = formatTimestampClean(log.timestamp),
                    color = FnbTextSecondary,
                    fontSize = 11.sp
                )
            }

            // Actor Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Actor: ",
                    color = FnbTextSecondary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "${log.actorName} ",
                    color = FnbTextPrimary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "(${log.actorId}) · ${log.actorRole}",
                    color = FnbGold,
                    fontSize = 11.sp
                )
            }

            // Target Row (if CRN / Email present)
            if (!log.targetCrn.isNullOrBlank() || !log.targetEmail.isNullOrBlank()) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = FnbCard,
                    border = BorderStroke(1.dp, Color(0xFF334155)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "Target: ", color = FnbTextSecondary, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                        Text(
                            text = buildString {
                                if (!log.targetCompany.isNullOrBlank()) append("${log.targetCompany} · ")
                                if (!log.targetCrn.isNullOrBlank()) append("CRN: ${log.targetCrn} · ")
                                if (!log.targetEmail.isNullOrBlank()) append(log.targetEmail)
                            },
                            color = Color(0xFF38BDF8),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Details Description
            Text(
                text = log.details,
                color = FnbTextPrimary,
                fontSize = 12.sp,
                lineHeight = 16.sp
            )

            HorizontalDivider(color = Color(0xFF262626), thickness = 0.8.dp)

            // Origin / Device / Network Footer
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "📱 ${log.deviceInfo}",
                    color = FnbTextMuted,
                    fontSize = 10.sp
                )
                Text(
                    text = "🌐 ${log.ipAddress}",
                    color = FnbTextMuted,
                    fontSize = 10.sp
                )
            }
        }
    }
}

@Composable
fun RmMetricTile(title: String, value: String, accentColor: Color, modifier: Modifier = Modifier) {
    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = FnbSurface),
        border = BorderStroke(1.dp, FnbBorder),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = title, color = FnbTextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Medium)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = value, color = accentColor, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun CustomerInvitationCard(
    invite: RmInvitation,
    viewModel: BankViewModel
) {
    Card(
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = FnbSurface),
        border = BorderStroke(1.dp, FnbBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Row 1: Company Name, CRN, Email, Phone, Status Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                    Text(
                        text = invite.companyName,
                        color = FnbTextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "CRN: ${invite.crn} · Email: ${invite.email}",
                        color = FnbTextSecondary,
                        fontSize = 11.sp
                    )
                    if (invite.phone.isNotBlank()) {
                        Text(
                            text = "Phone: ${invite.phone}",
                            color = FnbTextSecondary,
                            fontSize = 11.sp
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = when (invite.status) {
                        "completed" -> FnbSuccessBg
                        "in_progress" -> FnbPrimaryBg
                        else -> FnbGoldBg
                    }
                ) {
                    Text(
                        text = invite.status.replace("_", " ").uppercase(),
                        color = when (invite.status) {
                            "completed" -> FnbSuccess
                            "in_progress" -> FnbPrimary
                            else -> FnbGold
                        },
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            // Notes callout
            if (invite.notes.isNotBlank()) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFF1E2430),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Notes: ${invite.notes}",
                        color = FnbTextMuted,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                    )
                }
            }

            // Divider
            HorizontalDivider(color = Color(0xFF262626), thickness = 0.8.dp)

            // Stage Info & Formatted Dispatched Date
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = Color(0xFF1E293B)
                ) {
                    Text(
                        text = "Stage: Step ${invite.currentStep} of 7",
                        color = Color(0xFF93C5FD),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                Text(
                    text = "Dispatched: ${formatTimestampClean(invite.createdAt)}",
                    color = FnbTextSecondary,
                    fontSize = 10.sp
                )
            }

            // Action Buttons: Resend and Open Client View
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End)
            ) {
                OutlinedButton(
                    onClick = { viewModel.resendInvitation(invite.crn, invite.email) },
                    shape = RoundedCornerShape(6.dp),
                    border = BorderStroke(1.dp, FnbGold.copy(alpha = 0.6f)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = FnbGold),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Resend",
                        modifier = Modifier.size(13.dp),
                        tint = FnbGold
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Resend",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        softWrap = false
                    )
                }

                Button(
                    onClick = { viewModel.openCustomerPortalWithInvite(invite) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = FnbPrimaryBg,
                        contentColor = FnbPrimary
                    ),
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "Open Client View →",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }
        }
    }
}

@Composable
fun PaginationBar(
    currentPage: Int,
    totalPages: Int,
    totalItems: Int,
    pageSize: Int,
    onPageChange: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    if (totalItems == 0) return

    val startItem = (currentPage - 1) * pageSize + 1
    val endItem = minOf(currentPage * pageSize, totalItems)

    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = FnbSurface),
        border = BorderStroke(1.dp, FnbBorder),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Count indicator
            Text(
                text = "Showing $startItem–$endItem of $totalItems",
                color = FnbTextSecondary,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium
            )

            // Pagination Controls
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Previous button
                IconButton(
                    onClick = { if (currentPage > 1) onPageChange(currentPage - 1) },
                    enabled = currentPage > 1,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Previous Page",
                        tint = if (currentPage > 1) FnbGold else FnbTextMuted,
                        modifier = Modifier.size(15.dp)
                    )
                }

                // Visible page buttons
                val visiblePages = calculateVisiblePages(currentPage, totalPages)
                visiblePages.forEach { pageNum ->
                    if (pageNum == -1) {
                        Text(
                            text = "…",
                            color = FnbTextMuted,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(horizontal = 2.dp)
                        )
                    } else {
                        val isSelected = pageNum == currentPage
                        Box(
                            modifier = Modifier
                                .size(26.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(if (isSelected) FnbGold else Color(0xFF1E293B))
                                .clickable { onPageChange(pageNum) },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "$pageNum",
                                color = if (isSelected) Color.Black else FnbTextPrimary,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }

                // Next button
                IconButton(
                    onClick = { if (currentPage < totalPages) onPageChange(currentPage + 1) },
                    enabled = currentPage < totalPages,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = "Next Page",
                        tint = if (currentPage < totalPages) FnbGold else FnbTextMuted,
                        modifier = Modifier.size(15.dp)
                    )
                }
            }
        }
    }
}

fun calculateVisiblePages(current: Int, total: Int): List<Int> {
    if (total <= 5) return (1..total).toList()
    val pages = mutableListOf<Int>()
    pages.add(1)
    if (current > 3) pages.add(-1)
    val start = maxOf(2, current - 1)
    val end = minOf(total - 1, current + 1)
    for (i in start..end) {
        if (!pages.contains(i)) pages.add(i)
    }
    if (current < total - 2) pages.add(-1)
    if (!pages.contains(total)) pages.add(total)
    return pages
}

fun formatTimestampClean(raw: String): String {
    if (raw.isBlank()) return "Just now"
    if (!raw.contains("T") && !raw.matches(Regex("""\d{4}-\d{2}-\d{2}.*"""))) return raw
    return try {
        val clean = raw.replace("Z", "")
        if (clean.contains("T")) {
            val date = clean.substringBefore("T")
            val time = clean.substringAfter("T").take(5)
            "$date $time"
        } else {
            clean.take(16)
        }
    } catch (e: Exception) {
        raw.take(16)
    }
}
