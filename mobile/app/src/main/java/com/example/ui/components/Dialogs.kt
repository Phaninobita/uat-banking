package com.example.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.model.DocumentItem
import com.example.model.TransactionRecord
import com.example.ui.AppView
import com.example.ui.BankViewModel
import com.example.ui.theme.*
import java.util.*

// --- MAILBOX DIALOG ---

@Composable
fun MailboxDialog(viewModel: BankViewModel) {
    val emails by viewModel.simulatedEmails.collectAsState()

    Dialog(onDismissRequest = { viewModel.toggleMailbox() }) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = FnbSurface),
            border = BorderStroke(1.dp, FnbBorder),
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
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
                        Icon(Icons.Default.MailOutline, contentDescription = null, tint = FnbPrimary)
                        Text(
                            text = "Simulated Corporate Mailbox",
                            color = FnbTextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }
                    IconButton(onClick = { viewModel.toggleMailbox() }) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = FnbTextSecondary)
                    }
                }

                Text(
                    text = "Incoming emails for OTP codes, RM invitations & wire receipts",
                    color = FnbTextSecondary,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                HorizontalDivider(color = FnbBorder)

                if (emails.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(text = "No messages yet.", color = FnbTextMuted, fontSize = 12.sp)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        contentPadding = PaddingValues(vertical = 10.dp)
                    ) {
                        items(emails) { mail ->
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = FnbCard,
                                border = BorderStroke(1.dp, FnbBorder),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = mail.from,
                                            color = FnbPrimary,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 11.sp
                                        )
                                        Text(
                                            text = mail.timestamp,
                                            color = FnbTextMuted,
                                            fontSize = 10.sp
                                        )
                                    }
                                    Text(
                                        text = mail.subject,
                                        color = FnbTextPrimary,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 12.sp
                                    )
                                    Text(
                                        text = mail.text,
                                        color = FnbTextSecondary,
                                        fontSize = 11.sp
                                    )
                                    if (mail.code != null) {
                                        Surface(
                                            shape = RoundedCornerShape(4.dp),
                                            color = FnbPrimaryBg,
                                            border = BorderStroke(1.dp, FnbPrimary),
                                            modifier = Modifier.padding(top = 4.dp)
                                        ) {
                                            Text(
                                                text = "Verification Code: ${mail.code}",
                                                color = FnbPrimary,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 11.sp,
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
        }
    }
}

// --- WIRE TRANSFER DIALOG ---

@Composable
fun WireTransferDialog(viewModel: BankViewModel) {
    val accounts by viewModel.accounts.collectAsState()
    var selectedAccountNum by remember { mutableStateOf(accounts.firstOrNull()?.accountNumber ?: "7029841001") }
    var beneficiaryName by remember { mutableStateOf("") }
    var beneficiaryIban by remember { mutableStateOf("") }
    var amountText by remember { mutableStateOf("50000") }
    var description by remember { mutableStateOf("Vendor Invoice Settlement") }
    val isSubmitting by viewModel.isSubmittingTransfer.collectAsState()

    val currentAccount = accounts.find { it.accountNumber == selectedAccountNum } ?: accounts.firstOrNull()
    val currency = currentAccount?.currency ?: "AED"

    Dialog(onDismissRequest = { viewModel.isTransferSheetOpen.value = false }) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = FnbSurface),
            border = BorderStroke(1.dp, FnbBorder),
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Instant Corporate Wire Transfer",
                        color = FnbTextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    IconButton(onClick = { viewModel.isTransferSheetOpen.value = false }) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = FnbTextSecondary)
                    }
                }

                Text(
                    text = "High-value commercial payment clearing via Fedwire & SWIFT GPI",
                    color = FnbTextSecondary,
                    fontSize = 11.sp
                )

                // Source Account Selection
                Text(text = "Source Operating Account", color = FnbTextSecondary, fontSize = 11.sp)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(accounts) { acc ->
                        val isSelected = acc.accountNumber == selectedAccountNum
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (isSelected) FnbPrimaryBg else FnbCard,
                            border = BorderStroke(1.dp, if (isSelected) FnbPrimary else FnbBorder),
                            modifier = Modifier.clickable { selectedAccountNum = acc.accountNumber }
                        ) {
                            Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                                Text(
                                    text = "${acc.currency} Operating",
                                    color = if (isSelected) FnbPrimary else FnbTextPrimary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp
                                )
                                Text(
                                    text = "Avail: ${acc.currency} ${String.format(Locale.US, "%,.0f", acc.availableBalance)}",
                                    color = FnbTextSecondary,
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }
                }

                // Preset Beneficiaries
                Text(text = "Preset Beneficiaries (Quick Fill):", color = FnbTextMuted, fontSize = 10.sp)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = FnbCard,
                        border = BorderStroke(1.dp, FnbBorder),
                        modifier = Modifier
                            .weight(1f)
                            .clickable {
                                beneficiaryName = "Apex Logistics International LLC"
                                beneficiaryIban = "AE44021000009847162901"
                                description = "Freight & Shipping Settlement"
                            }
                    ) {
                        Text(text = "Apex Logistics", color = FnbPrimary, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(6.dp))
                    }
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = FnbCard,
                        border = BorderStroke(1.dp, FnbBorder),
                        modifier = Modifier
                            .weight(1f)
                            .clickable {
                                beneficiaryName = "Delaware Cloud Infrastructure"
                                beneficiaryIban = "US29CITI00004928172910"
                                description = "Q3 Enterprise API Servers"
                            }
                    ) {
                        Text(text = "Cloud Hosting", color = FnbGold, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(6.dp))
                    }
                }

                OutlinedTextField(
                    value = beneficiaryName,
                    onValueChange = { beneficiaryName = it },
                    label = { Text("Beneficiary Legal Entity Name") },
                    placeholder = { Text("e.g. Apex Logistics International LLC") },
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
                    value = beneficiaryIban,
                    onValueChange = { beneficiaryIban = it },
                    label = { Text("Beneficiary IBAN / Routing Number") },
                    placeholder = { Text("e.g. AE44021000009847162901") },
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
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("Transfer Amount ($currency)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
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
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Payment Reference / Description") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = FnbTextPrimary,
                        unfocusedTextColor = FnbTextPrimary,
                        focusedBorderColor = FnbPrimary,
                        unfocusedBorderColor = FnbBorder
                    )
                )

                Spacer(modifier = Modifier.height(6.dp))

                Button(
                    onClick = {
                        val amt = amountText.toDoubleOrNull() ?: 0.0
                        viewModel.executeWireTransfer(
                            selectedAccountNum,
                            beneficiaryName,
                            beneficiaryIban,
                            amt,
                            currency,
                            description
                        )
                    },
                    enabled = !isSubmitting,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = FnbPrimary,
                        contentColor = FnbDarkBg
                    ),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(46.dp)
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = FnbDarkBg, strokeWidth = 2.dp)
                    } else {
                        Text(text = "Authorize & Execute Wire Transfer", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

// --- TRANSFER SUCCESS DIALOG ---

@Composable
fun TransferSuccessDialog(tx: TransactionRecord, onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = FnbSurface),
            border = BorderStroke(1.dp, FnbSuccess),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .clip(CircleShape)
                        .background(FnbSuccessBg),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = FnbSuccess, modifier = Modifier.size(32.dp))
                }

                Text(
                    text = "Wire Transfer Settled",
                    color = FnbTextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
                Text(
                    text = "${tx.currency} ${String.format(Locale.US, "%,.2f", tx.amount)} transferred to ${tx.counterpartyName}",
                    color = FnbTextSecondary,
                    fontSize = 12.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )

                Spacer(modifier = Modifier.height(4.dp))

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = FnbCard,
                    border = BorderStroke(1.dp, FnbBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(text = "Transaction Ref: ${tx.transactionRef}", color = FnbPrimary, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                        Text(text = "SWIFT UETR: ${tx.swiftUetr}", color = FnbTextSecondary, fontSize = 9.sp)
                        Text(text = "Channel: ${tx.channel} · Status: Settled ✓", color = FnbSuccess, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = FnbPrimary, contentColor = FnbDarkBg),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(text = "Done", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// --- SUBMISSION SUCCESS DIALOG ---

@Composable
fun SubmissionSuccessDialog(
    refCode: String,
    onOpenBanking: () -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = FnbSurface),
            border = BorderStroke(1.dp, FnbSuccess),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(CircleShape)
                        .background(FnbSuccessBg),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = FnbSuccess, modifier = Modifier.size(36.dp))
                }

                Text(
                    text = "Application Submitted!",
                    color = FnbTextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp
                )

                Text(
                    text = "Your corporate account onboarding application has been submitted to the First National Bank compliance team.",
                    color = FnbTextSecondary,
                    fontSize = 12.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )

                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = FnbCard,
                    border = BorderStroke(1.dp, FnbPrimary),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(text = "Application Reference", color = FnbTextSecondary, fontSize = 10.sp)
                        Text(text = refCode, color = FnbPrimary, fontWeight = FontWeight.Black, fontSize = 20.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = "Assigned RM: Michael Vance (Compliance Desk)", color = FnbTextMuted, fontSize = 10.sp)
                    }
                }

                Button(
                    onClick = onOpenBanking,
                    colors = ButtonDefaults.buttonColors(containerColor = FnbPrimary, contentColor = FnbDarkBg),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.AccountBalance, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(text = "Open Live Core Banking & Treasury", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }

                TextButton(onClick = onDismiss) {
                    Text(text = "Stay on Application Review", color = FnbTextSecondary, fontSize = 11.sp)
                }
            }
        }
    }
}

// --- DOCUMENT PREVIEW DIALOG ---

@Composable
fun DocumentPreviewDialog(
    doc: DocumentItem,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    var copied by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = FnbSurface),
            border = BorderStroke(1.dp, FnbBorder),
            modifier = Modifier
                .fillMaxWidth()
                .padding(4.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(FnbPrimary.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Description,
                                contentDescription = null,
                                tint = FnbPrimary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                        Column {
                            Text(
                                text = "Document Vault Preview",
                                color = FnbTextPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                            Text(
                                text = doc.title,
                                color = FnbTextSecondary,
                                fontSize = 12.sp
                            )
                        }
                    }
                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = FnbTextMuted)
                    }
                }

                HorizontalDivider(color = FnbBorder)

                // Metadata details
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = FnbCard,
                    border = BorderStroke(1.dp, FnbBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("File Name", color = FnbTextMuted, fontSize = 11.sp)
                            Text(doc.fileName.ifBlank { "document_payload.pdf" }, color = FnbTextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Format / Type", color = FnbTextMuted, fontSize = 11.sp)
                            Text(doc.fileType.ifBlank { "application/pdf" }, color = FnbTextPrimary, fontSize = 11.sp)
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("File Size", color = FnbTextMuted, fontSize = 11.sp)
                            Text("${if (doc.fileSizeKb > 0) doc.fileSizeKb else 1240} KB", color = FnbTextPrimary, fontSize = 11.sp)
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Verification Status", color = FnbTextMuted, fontSize = 11.sp)
                            Text(
                                text = if (doc.ocrStatus.isNotBlank()) doc.ocrStatus else "Verified ✓",
                                color = FnbSuccess,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Storage Vault", color = FnbTextMuted, fontSize = 11.sp)
                            Text("Encrypted Base64 Database", color = FnbPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Base64 Payload Inspector
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = FnbDarkBg,
                    border = BorderStroke(1.dp, FnbBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Base64 Vault String",
                                color = FnbTextSecondary,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            val b64Len = if (doc.fileDataBase64.isNotBlank()) doc.fileDataBase64.length else 320
                            Text(
                                text = "$b64Len chars",
                                color = FnbTextMuted,
                                fontSize = 10.sp
                            )
                        }
                        val sampleDisplay = if (doc.fileDataBase64.isNotBlank()) {
                            doc.fileDataBase64.take(120) + "..."
                        } else {
                            "JVBERi0xLjQKJeLjz9MKMSAwIG9iaiA8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PmVuZG9iagoyIDAgb2Jq..."
                        }
                        Text(
                            text = sampleDisplay,
                            color = FnbPrimary.copy(alpha = 0.8f),
                            fontSize = 10.sp,
                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                            maxLines = 3
                        )
                    }
                }

                // Action buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                            val clip = ClipData.newPlainText("Base64 Document", doc.fileDataBase64.ifBlank { "JVBERi0xLjQ..." })
                            clipboard?.setPrimaryClip(clip)
                            copied = true
                        },
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = FnbPrimary),
                        border = BorderStroke(1.dp, FnbPrimary),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(
                            if (copied) Icons.Default.Check else Icons.Default.ContentCopy,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(if (copied) "Copied!" else "Copy Base64", fontSize = 12.sp)
                    }

                    Button(
                        onClick = onDismiss,
                        colors = ButtonDefaults.buttonColors(containerColor = FnbPrimary, contentColor = FnbDarkBg),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Close", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

