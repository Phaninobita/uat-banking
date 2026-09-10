package com.example.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.CorporateAccount
import com.example.model.TransactionRecord
import com.example.ui.BankViewModel
import com.example.ui.TxFilter
import com.example.ui.theme.*
import java.util.*

@Composable
fun LiveBankingScreen(
    viewModel: BankViewModel
) {
    val isCustomerLoggedIn by viewModel.isCustomerLoggedIn.collectAsState()
    if (!isCustomerLoggedIn) {
        CustomerLoginScreen(viewModel = viewModel)
        return
    }

    val accounts by viewModel.accounts.collectAsState()
    val transactions by viewModel.transactions.collectAsState()
    val fxRates by viewModel.fxRates.collectAsState()
    val filter by viewModel.txFilter.collectAsState()
    val searchQuery by viewModel.txSearch.collectAsState()
    val context = LocalContext.current

    val totalLiquidityAed = viewModel.getTotalLiquidityAed()

    val filteredTransactions = transactions.filter { tx ->
        val matchesFilter = when (filter) {
            TxFilter.ALL -> true
            TxFilter.CREDITS -> tx.type == "credit"
            TxFilter.DEBITS -> tx.type == "debit"
        }
        val matchesSearch = searchQuery.isBlank() ||
                tx.counterpartyName.contains(searchQuery, ignoreCase = true) ||
                tx.description.contains(searchQuery, ignoreCase = true) ||
                tx.transactionRef.contains(searchQuery, ignoreCase = true)
        matchesFilter && matchesSearch
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FnbDarkBg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Total Aggregated Liquidity Hero Card (Mobile-proportioned)
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.Transparent),
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(Color(0xFF0F1E36), Color(0xFF1B2F4E))
                    ),
                    shape = RoundedCornerShape(16.dp)
                )
                .border(1.dp, Color(0xFF2A4A75), RoundedCornerShape(16.dp))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(18.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Total Liquidity (AED Equiv.)",
                        color = FnbTextSecondary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = FnbSuccessBg,
                        border = BorderStroke(1.dp, FnbSuccess)
                    ) {
                        Text(
                            text = "● Real-Time FTS",
                            color = FnbSuccess,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = "AED ${String.format(Locale.US, "%,.2f", totalLiquidityAed)}",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 26.sp
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Mobile Quick Action Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { viewModel.isTransferSheetOpen.value = true },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = FnbPrimary,
                            contentColor = FnbDarkBg
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(46.dp)
                    ) {
                        Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Wire Transfer",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                    }

                    Button(
                        onClick = {
                            val mainAccount = accounts.firstOrNull()
                            if (mainAccount != null) {
                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                clipboard.setPrimaryClip(ClipData.newPlainText("IBAN", mainAccount.iban))
                                viewModel.showToast("Copied AED IBAN: ${mainAccount.iban}")
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = FnbCard,
                            contentColor = FnbTextPrimary
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(46.dp)
                    ) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Copy IBAN",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }

        // Live FX Rates Ticker
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Live FX Ticker",
                    color = FnbTextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
                Text(
                    text = "Live 8s updates",
                    color = FnbTextMuted,
                    fontSize = 10.sp
                )
            }

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(fxRates) { fx ->
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = FnbSurface,
                        border = BorderStroke(1.dp, FnbBorder)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(text = fx.pair, color = FnbTextPrimary, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                            Text(text = "${fx.rate}", color = FnbPrimary, fontSize = 11.sp)
                            Text(
                                text = fx.change24h,
                                color = if (fx.change24h.startsWith("+")) FnbSuccess else FnbError,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        // Accounts Carousel Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "Operating Accounts",
                color = FnbTextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
            Text(
                text = "Swipe to view currencies →",
                color = FnbTextSecondary,
                fontSize = 10.sp
            )
        }

        // Responsive Mobile Account Cards (Width 290dp each for ideal phone aspect ratio)
        if (accounts.isEmpty()) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = FnbSurface,
                border = BorderStroke(1.dp, FnbBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.AccountBalance,
                        contentDescription = null,
                        tint = FnbTextMuted,
                        modifier = Modifier.size(32.dp)
                    )
                    Text(
                        text = "No Active Accounts Yet",
                        color = FnbTextPrimary,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp
                    )
                    Text(
                        text = "Complete your onboarding verification and approval to activate corporate multi-currency treasury accounts.",
                        color = FnbTextSecondary,
                        fontSize = 11.sp,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
            }
        } else {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(accounts) { account ->
                    MobileAccountCard(account = account) { iban ->
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        clipboard.setPrimaryClip(ClipData.newPlainText("IBAN", iban))
                        viewModel.showToast("Copied IBAN: $iban")
                    }
                }
            }
        }

        // Transaction Ledger Section
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Recent Transactions",
                    color = FnbTextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Text(
                    text = "${filteredTransactions.size} items",
                    color = FnbTextSecondary,
                    fontSize = 11.sp
                )
            }

            // Mobile Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { viewModel.txSearch.value = it },
                placeholder = { Text("Search transactions...", fontSize = 12.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = FnbTextSecondary, modifier = Modifier.size(16.dp)) },
                trailingIcon = {
                    if (searchQuery.isNotBlank()) {
                        IconButton(onClick = { viewModel.txSearch.value = "" }) {
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

            // Mobile Filter Segmented Chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                TxFilter.values().forEach { f ->
                    val isSelected = filter == f
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (isSelected) FnbPrimaryBg else FnbSurface,
                        border = BorderStroke(1.dp, if (isSelected) FnbPrimary else FnbBorder),
                        modifier = Modifier
                            .weight(1f)
                            .clickable { viewModel.txFilter.value = f }
                    ) {
                        Text(
                            text = f.name.lowercase().replaceFirstChar { it.uppercase() },
                            color = if (isSelected) FnbPrimary else FnbTextSecondary,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    }
                }
            }

            // Transaction Cards List
            if (filteredTransactions.isEmpty()) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = FnbSurface,
                    border = BorderStroke(1.dp, FnbBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.ReceiptLong, contentDescription = null, tint = FnbTextMuted, modifier = Modifier.size(32.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = "No transactions found matching criteria.", color = FnbTextSecondary, fontSize = 12.sp)
                    }
                }
            } else {
                filteredTransactions.forEach { tx ->
                    MobileTransactionCard(tx = tx)
                }
            }
        }
    }
}

@Composable
fun MobileAccountCard(account: CorporateAccount, onCopyIban: (String) -> Unit) {
    val gradientColors = when (account.currency) {
        "AED" -> listOf(FnbCardAedGradStart, FnbCardAedGradEnd)
        "USD" -> listOf(FnbCardUsdGradStart, FnbCardUsdGradEnd)
        else -> listOf(FnbCardEurGradStart, FnbCardEurGradEnd)
    }

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        modifier = Modifier
            .width(290.dp)
            .background(
                brush = Brush.linearGradient(colors = gradientColors),
                shape = RoundedCornerShape(14.dp)
            )
            .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(14.dp))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = account.accountType,
                    color = Color(0xDDFFFFFF),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0x33FFFFFF)
                ) {
                    Text(
                        text = account.currency,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "${account.currency} ${String.format(Locale.US, "%,.2f", account.balance)}",
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontSize = 20.sp
            )

            Text(
                text = "Available: ${account.currency} ${String.format(Locale.US, "%,.2f", account.availableBalance)}",
                color = Color(0xAAFFFFFF),
                fontSize = 10.sp
            )

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = Color(0x22FFFFFF))
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = account.iban,
                    color = Color(0xEEFFFFFF),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                IconButton(
                    onClick = { onCopyIban(account.iban) },
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.ContentCopy,
                        contentDescription = "Copy IBAN",
                        tint = Color.White,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun MobileTransactionCard(tx: TransactionRecord) {
    Card(
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = FnbSurface),
        border = BorderStroke(1.dp, FnbBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(if (tx.type == "credit") FnbSuccessBg else FnbErrorBg),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (tx.type == "credit") Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                        contentDescription = null,
                        tint = if (tx.type == "credit") FnbSuccess else FnbError,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Column {
                    Text(
                        text = tx.counterpartyName,
                        color = FnbTextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${tx.description} · ${tx.timestamp}",
                        color = FnbTextSecondary,
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "Ref: ${tx.transactionRef}",
                        color = FnbTextMuted,
                        fontSize = 9.sp
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                val prefix = if (tx.type == "credit") "+ " else "- "
                Text(
                    text = "$prefix${tx.currency} ${String.format(Locale.US, "%,.2f", tx.amount)}",
                    color = if (tx.type == "credit") FnbSuccess else FnbError,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = Color(0x1F10B981)
                ) {
                    Text(
                        text = tx.status.uppercase(),
                        color = FnbSuccess,
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}
